import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/user.entity';
import { UserStatus } from '../users/userstatus.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,

        @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(UserStatus)
    private readonly statusRepo: Repository<UserStatus>,
    
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      access_token: this.jwtService.sign({
        userId: user.id,
        role: user.role.name,
        email: user.email,    
      }),
    };
  }

  async logout(user: any) {

    return { message: 'Logged out successfully' };
  }
  async activateAccount(token: string) {
  const user = await this.userRepo.findOne({
    where: { activation_token: token },
  });

  if (!user) {
    throw new BadRequestException('Invalid token');
  }

  const activeStatus = await this.statusRepo.findOne({
    where: { code: 'actif' },
  });

  // ✅ FIX 1: handle null properly
  if (!activeStatus) {
    throw new BadRequestException('Active status not found');
  }

  // ✅ FIX 2: safe assignment
  user.status = activeStatus;

  user.activation_token = null;

  await this.userRepo.save(user);

  return { message: 'Account activated successfully' };
}
}