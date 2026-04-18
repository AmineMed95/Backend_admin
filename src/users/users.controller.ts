import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('create-admin')
  createAdmin(@Body() dto: any) {
    return this.usersService.createAdmin(dto);
  }
}