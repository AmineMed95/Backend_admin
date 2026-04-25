import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './user.entity';
import { Role } from '../roles/role.entity';
import { randomBytes } from 'crypto';
import { ConflictException } from '@nestjs/common';
import { UserStatus } from './userstatus.entity';
import { EmailService } from '../mail/mail.service';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    
    @InjectRepository(UserStatus)
    private statusRepo: Repository<UserStatus>,
    
    private emailService: EmailService,


  ) {}

  findByEmail(email: string) {
    return this.userRepo.findOne({
      where: { email },
      relations: ['role'],
      select: {
        id: true,
        email: true,
        password: true,
        activation_token: true,
        role: {
          id: true,
          name: true,
        },
      },
    });
  }

      private generateStrongPassword(length = 12): string {
      const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}<>?';

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
  });

  const saved = await this.userRepo.save(admin);

  const user = Array.isArray(saved) ? saved[0] : saved;

  await this.emailService.sendAdminCreationEmail(
    user.email,
    password,
    token,
  );

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

  // 👇 Check if email already used by another user
  if (dto.email && dto.email !== admin.email) {
    const emailExists = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (emailExists) {
      throw new ConflictException('Email already exists');
    }
  }

  // 👇 Check if phone already used by another user
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
}