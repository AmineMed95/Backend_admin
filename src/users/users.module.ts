import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';

import { User } from './user.entity';
import { Role } from '../roles/role.entity';
import { UserStatus } from './userstatus.entity';

import { MailModule } from '../mail/mail.module'; 
import { EmailService } from 'src/mail/mail.service';
import { Client } from 'src/clients/client.entity';
import { ClientsController } from 'src/clients/clients.controller';
import { ClientsService } from 'src/clients/clients.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, UserStatus, Client]),
    MailModule, 
  ],
  controllers: [UsersController, ClientsController],
  providers: [UsersService, EmailService, ClientsService],
  exports: [UsersService],
})
export class UsersModule {}