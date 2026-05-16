import { ForbiddenException, Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './user.entity';
import { Role } from '../roles/role.entity';
import { randomBytes } from 'crypto';
import { ConflictException } from '@nestjs/common';
import { UserStatus } from './userstatus.entity';
import { EmailService } from '../mail/mail.service';
import { ChangePasswordDto } from './dto/change-password.dto';
@Injectable()
export class UsersService {
  // Configurable delay in hours, default 48h
  private readonly activationResendDelayHours: number;
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Role)
    private roleRepo: Repository<Role>,

    @InjectRepository(UserStatus)
    private statusRepo: Repository<UserStatus>,

    private emailService: EmailService,
  ) {
    this.activationResendDelayHours = parseInt(
      process.env.ACTIVATION_RESEND_DELAY_HOURS ?? '48',
      10,
    );
  }

  findByEmail(email: string) {
    return this.userRepo.findOne({
      where: { email },
      relations: ['role'],
      select: {
        id: true,
        email: true,
        password: true,
        activation_token: true,
        first_name: true,
        last_name: true,
        role: {
          id: true,
          name: true,
        },
      },
    });
  }

  private generateStrongPassword(length = 12): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}?';

    let password = '';
    const bytes = randomBytes(length);

    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length];
    }

    return password;
  }




  async createAdmin(dto: any) {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    const phoneExists = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });

    if (phoneExists) {
      throw new ConflictException('Phone already exists');
    }

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const role = await this.roleRepo.findOne({
      where: { name: 'admin' },
    });

    const status = await this.statusRepo.findOne({
      where: { code: 'en_attend' },
    });

    const password = this.generateStrongPassword(14);
    const hashed = await bcrypt.hash(password, 10);

    const token = randomBytes(32).toString('hex');

    const admin = this.userRepo.create({
      ...dto,
      password: hashed,
      role_id: role?.id,
      status: status,
      activation_token: token,
      activation_sent_at: new Date(),
    });

    const saved = await this.userRepo.save(admin);

    const user = Array.isArray(saved) ? saved[0] : saved;

    await this.emailService.sendAdminCreationEmail(user.email, password, token);

    return {
      message: 'Admin created & email sent',
      email: user.email,
    };
  }

  async getListAdmin() {
    return this.userRepo.find({
      relations: ['role', 'status'],
      where: {
        role: {
          name: 'admin',
        },
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        status: true,
        organization_name: true,
        created_at: true,
        phone: true,
        role: {
          id: true,
          name: true,
        },
      },
    });
  }

  async updateInactiveAdmin(id: number, dto: any) {
    const admin = await this.userRepo.findOne({
      where: { id },
      relations: ['role', 'status'],
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (admin.role?.name !== 'admin') {
      throw new ForbiddenException('User is not an admin');
    }

    if (admin.status?.code === 'actif') {
      throw new ForbiddenException('Cannot update an active admin');
    }

    if (dto.email && dto.email !== admin.email) {
      const emailExists = await this.userRepo.findOne({
        where: { email: dto.email },
      });

      if (emailExists) {
        throw new ConflictException('Email already exists');
      }
    }

    if (dto.phone && dto.phone !== admin.phone) {
      const phoneExists = await this.userRepo.findOne({
        where: { phone: dto.phone },
      });

      if (phoneExists) {
        throw new ConflictException('Phone already exists');
      }
    }

    Object.assign(admin, dto);
    const updated = await this.userRepo.save(admin);

    return {
      message: 'Admin updated successfully',
      data: updated,
    };
  }

  async deleteInactiveAdmin(id: number) {
    const admin = await this.userRepo.findOne({
      where: { id },
      relations: ['role', 'status'],
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (admin.role?.name !== 'admin') {
      throw new ForbiddenException('User is not an admin');
    }

    if (admin.activation_token === null ) {
      throw new ForbiddenException('Cannot delete an active admin');
    }

    await this.userRepo.remove(admin);

    return {
      message: 'Admin deleted successfully',
    };
  }
  /**
   * Resend activation email to a pending admin.
   * Enforces a configurable minimum delay (default: 48h) since the last send.
   */
  async resendActivationEmail(id: number) {
    const admin = await this.userRepo.findOne({
      where: { id },
      relations: ['role', 'status'],
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (admin.role?.name !== 'admin') {
      throw new ForbiddenException('User is not an admin');
    }

    // Already activated — activation_token is cleared on activation
    if (admin.activation_token === null) {
      throw new ForbiddenException('Admin account is already activated');
    }

    // Enforce the configurable delay before allowing a resend
    if (admin.activation_sent_at) {
      const hoursSinceLastSend =
        (Date.now() - new Date(admin.activation_sent_at).getTime()) /
        (1000 * 60 * 60);

      if (hoursSinceLastSend < this.activationResendDelayHours) {
        const hoursRemaining = Math.ceil(
          this.activationResendDelayHours - hoursSinceLastSend,
        );
        throw new BadRequestException(
          `Activation email was already sent. Please wait ${hoursRemaining} more hour(s) before resending.`,
        );
      }
    }

    // Generate a fresh token + password and resend
    const newPassword = this.generateStrongPassword(14);
    const newHashed = await bcrypt.hash(newPassword, 10);
    const newToken = randomBytes(32).toString('hex');

    admin.password = newHashed;
    admin.activation_token = newToken;
    admin.activation_sent_at = new Date();

    await this.userRepo.save(admin);

    await this.emailService.sendAdminCreationEmail(
      admin.email,
      newPassword,
      newToken,
    );

    return {
      message: 'Activation email resent successfully',
      email: admin.email,
    };
  }

    async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    // Verify current password
    const isMatch = await bcrypt.compare(dto.current_password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Mot de passe actuel incorrect.');
    }

    // Prevent reusing the same password
    const isSame = await bcrypt.compare(dto.new_password, user.password);
    if (isSame) {
      throw new BadRequestException(
        'Le nouveau mot de passe doit être différent de l\'ancien.',
      );
    }

    user.password = await bcrypt.hash(dto.new_password, 10);
    await this.userRepo.save(user);

    return {
      message: 'Mot de passe modifié avec succès.',
    };
  }
}