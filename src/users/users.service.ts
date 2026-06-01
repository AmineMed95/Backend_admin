import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
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
import { OrganisationsService } from 'src/organisation/organisations.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { Organisation } from '../organisation/organisation.entity'; 

@Injectable()
export class UsersService {
  private readonly activationResendDelayHours: number;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Role)
    private roleRepo: Repository<Role>,

    @InjectRepository(UserStatus)
    private statusRepo: Repository<UserStatus>,

    private emailService: EmailService,

    private readonly organisationsService: OrganisationsService,
  ) {
    this.activationResendDelayHours = parseInt(
      process.env.ACTIVATION_RESEND_DELAY_HOURS ?? '48',
      10,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

findByEmail(email: string) {
  return this.userRepo.findOne({
    where: { email },
    relations: ['role', 'organisation'],
    select: {
      id: true,
      email: true,
      password: true,
      activation_token: true,
      first_name: true,
      last_name: true,
      phone:true,
      role: {
        id: true,
        name: true,
      },
      organisation: {
        id: true,
        name_organisation: true, 
        logo_organisation: true,  
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

  // ─────────────────────────────────────────────────────────────────────────────
  // createAdmin
  // ─────────────────────────────────────────────────────────────────────────────

 
  async createAdmin(dto: CreateAdminDto) {
    const organisation = await this.organisationsService.findOne(
      dto.organisation_id,
    );

    // ✅ One admin per organisation
    const orgHasAdmin = await this.userRepo.findOne({
      where: {
        organisation_id: dto.organisation_id,
        role: { name: 'admin' },
      },
      relations: ['role'],
    });
    if (orgHasAdmin) {
      throw new ConflictException(
        'Cette organisation a déjà un administrateur.',
      );
    }

    const emailExists = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (emailExists) {
      throw new ConflictException('Email already exists');
    }

    if (dto.phone) {
      const phoneExists = await this.userRepo.findOne({
        where: { phone: dto.phone },
      });
      if (phoneExists) {
        throw new ConflictException('Phone already exists');
      }
    }

    const role = await this.roleRepo.findOne({ where: { name: 'admin' } });
    if (!role) throw new NotFoundException('Role "admin" not found');

    const status = await this.statusRepo.findOne({ where: { code: 'en_attend' } });
    if (!status) throw new NotFoundException('Status "en_attend" not found');

    const password = this.generateStrongPassword(14);
    const hashed = await bcrypt.hash(password, 10);
    const token = randomBytes(32).toString('hex');

    const admin = this.userRepo.create({
      first_name:        dto.first_name,
      last_name:         dto.last_name,
      email:             dto.email,
      phone:             dto.phone,
      password:          hashed,
      organisation_id:   organisation.id,
      role_id:           role.id,
      status,
      activation_token:  token,
      activation_sent_at: new Date(),
    })

    const saved = await this.userRepo.save(admin)
    const user = Array.isArray(saved) ? saved[0] : saved

    await this.emailService.sendAdminCreationEmail(user.email, password, token)

    return {
      message:      'Admin created & email sent',
      email:        user.email,
      organisation: organisation.name_organisation,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // getListAdmin — now loads `organisation` relation instead of raw string
  // ─────────────────────────────────────────────────────────────────────────────

  async getListAdmin() {
    return this.userRepo.find({
      relations: ['role', 'status', 'organisation'],
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
        phone: true,
        created_at: true,
        status: {
          id: true,
          code: true,
          label: true,
        },
        role: {
          id: true,
          name: true,
        },
        organisation: {
          id: true,
          name_organisation: true,
          adresse_organisation: true,
          phone_organisation: true,
          logo_organisation: true,
        },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // updateInactiveAdmin — supports optional organisation_id change
  // ─────────────────────────────────────────────────────────────────────────────
  async updateInactiveAdmin(id: number, dto: UpdateAdminDto) {
    const admin = await this.userRepo.findOne({
      where: { id },
      relations: ['role', 'status', 'organisation'],
    });

    if (!admin) throw new NotFoundException('Admin not found');
    if (admin.role?.name !== 'admin') throw new ForbiddenException('User is not an admin');
   /* if (admin.status?.code === 'actif') throw new ForbiddenException('Cannot update an active admin');*/

    if (dto.email && dto.email !== admin.email) {
      const emailExists = await this.userRepo.findOne({ where: { email: dto.email } });
      if (emailExists) throw new ConflictException('Email already exists');
    }

    if (dto.phone && dto.phone !== admin.phone) {
      const phoneExists = await this.userRepo.findOne({ where: { phone: dto.phone } });
      if (phoneExists) throw new ConflictException('Phone already exists');
    }

    // ✅ Validate org exists, then assign as relation object
    if (dto.organisation_id !== undefined) {
      await this.organisationsService.findOne(dto.organisation_id);
      admin.organisation = { id: dto.organisation_id } as Organisation;
    }

    // Apply scalar fields only
    const { organisation_id, ...scalarFields } = dto;
    Object.assign(admin, scalarFields);

    const updated = await this.userRepo.save(admin);

    const result = await this.userRepo.findOne({
      where: { id: updated.id },
      relations: ['role', 'status', 'organisation'],
    });

    return { message: 'Admin updated successfully', data: result };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // deleteInactiveAdmin — unchanged logic, no organisation dependency
  // ─────────────────────────────────────────────────────────────────────────────

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

    if (admin.activation_token === null) {
      throw new ForbiddenException('Cannot delete an active admin');
    }

    await this.userRepo.remove(admin);

    return {
      message: 'Admin deleted successfully',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // resendActivationEmail — unchanged logic
  // ─────────────────────────────────────────────────────────────────────────────

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

    if (admin.activation_token === null) {
      throw new ForbiddenException('Admin account is already activated');
    }

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

  // ─────────────────────────────────────────────────────────────────────────────
  // changePassword — unchanged logic
  // ─────────────────────────────────────────────────────────────────────────────

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    const isMatch = await bcrypt.compare(dto.current_password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Mot de passe actuel incorrect.');
    }

    const isSame = await bcrypt.compare(dto.new_password, user.password);
    if (isSame) {
      throw new BadRequestException(
        "Le nouveau mot de passe doit être différent de l'ancien.",
      );
    }

    user.password = await bcrypt.hash(dto.new_password, 10);
    await this.userRepo.save(user);

    return {
      message: 'Mot de passe modifié avec succès.',
    };
  }
}