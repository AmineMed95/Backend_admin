import { Controller, Post, Body, Get, UseGuards, Req, Headers } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { ResendAccessCodeDto } from './dto/resend-access-code.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ClientLoginDto } from './dto/client-login-dto';
import { resolveLang } from '../common/utils/lang.util';

@Controller('clients')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('create')
  createClient(
    @Body() dto: CreateClientDto,
    @Req() req: any,
    @Headers('accept-language') lang: string,
  ) {
    return this.clientsService.createClient(dto, req.user.userId, resolveLang(lang));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('list')
  getClients(@Req() req: any) {
    return this.clientsService.getClients(req.user.userId);
  }

  @Post('resend-access-code')
  resendAccessCode(
    @Body() dto: ResendAccessCodeDto,
    @Headers('accept-language') lang: string,
  ) {
    return this.clientsService.resendAccessCode(dto, resolveLang(lang));
  }

  @Post('login')
  loginWithAccessCode(
    @Body() dto: ClientLoginDto,
    @Headers('accept-language') lang: string,
  ) {
    return this.clientsService.loginWithAccessCode(dto, resolveLang(lang));
  }
}
