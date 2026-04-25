import { Controller, Post, Body, UseGuards, Get, Patch, Delete, Param, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('create-admin')
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.usersService.createAdmin(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get('get-list-admin')
  getListAdmin() {
    return this.usersService.getListAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
@Patch('update-admin/:id')
updateInactiveAdmin(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateAdminDto,
) {
  return this.usersService.updateInactiveAdmin(id, dto);
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
@Delete('delete-admin/:id')
deleteInactiveAdmin(@Param('id', ParseIntPipe) id: number) {
  return this.usersService.deleteInactiveAdmin(id);
}
}