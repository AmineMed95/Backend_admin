import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /*@Post('register')
  register(@Body() body: any) {
    return this.authService.register(body.email, body.password);
  }*/

  @Post('login')
  login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }

    @Get('activate')
  activateAccount(@Query('token') token: string) {
    return this.authService.activateAccount(token);
  }
}