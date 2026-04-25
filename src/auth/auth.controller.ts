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

  // 👇 Step 1 — Request password reset
  @Post('forgot-password')
  forgotPassword(@Body() body: any) {
    return this.authService.forgotPassword(body.email);
  }

  // 👇 Step 2 — Reset password with token
@Post('reset-password')
resetPassword(@Body() body: any) {
  return this.authService.resetPassword(body.token, body.password, body.confirm_password);
}
}