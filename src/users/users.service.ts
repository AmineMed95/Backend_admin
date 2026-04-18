import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './user.entity';
import { Role } from '../roles/role.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
  ) {}

  findByEmail(email: string) {
    return this.userRepo.findOne({
      where: { email },
      relations: ['role'],
    });
  }

  async createAdmin(dto: any) {
    const role = await this.roleRepo.findOne({
      where: { name: 'admin' },
    });

    const hashed = await bcrypt.hash(dto.password, 10);

    const admin = this.userRepo.create({
      ...dto,
      password: hashed,
      role_id: role?.id,
      status: true,
    });

    return this.userRepo.save(admin);
  }
}