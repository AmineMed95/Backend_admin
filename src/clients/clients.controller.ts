import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('clients')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('create')
  createClient(@Body() dto: CreateClientDto, @Req() req: any) {
    return this.clientsService.createClient(dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('list')
  getClients(@Req() req: any) {
    return this.clientsService.getClients(req.user.userId);
  }
}