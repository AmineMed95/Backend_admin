import { Controller, Post, Body, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    logout(@Req() req: any) {
      return this.authService.logout(req.user);
    }

    @Get('activate')
  activateAccount(@Query('token') token: string) {
    return this.authService.activateAccount(token);
  }
}