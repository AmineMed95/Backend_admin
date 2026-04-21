import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';

import { User } from './user.entity';
import { Role } from '../roles/role.entity';
import { UserStatus } from './userstatus.entity';

import { MailModule } from '../mail/mail.module'; 
import { EmailService } from 'src/mail/mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, UserStatus]),
    MailModule, 
  ],
  controllers: [UsersController],
  providers: [UsersService, EmailService],
  exports: [UsersService],
})
export class UsersModule {}