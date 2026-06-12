import { Controller, Post, Body, Get, Query, Req, UseGuards, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { resolveLang } from '../common/utils/lang.util';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(
    @Body() body: any,
    @Headers('accept-language') lang: string,
  ) {
    return this.authService.login(body.email, body.password, resolveLang(lang));
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(
    @Req() req: any,
    @Headers('accept-language') lang: string,
  ) {
    return this.authService.logout(req.user, resolveLang(lang));
  }

  @Get('activate')
  activateAccount(
    @Query('token') token: string,
    @Headers('accept-language') lang: string,
  ) {
    return this.authService.activateAccount(token, resolveLang(lang));
  }

  @Post('forgot-password')
  forgotPassword(
    @Body() body: any,
    @Headers('accept-language') lang: string,
  ) {
    return this.authService.forgotPassword(body.email, resolveLang(lang));
  }

  @Post('reset-password')
  resetPassword(
    @Body() body: any,
    @Headers('accept-language') lang: string,
  ) {
    return this.authService.resetPassword(
      body.token,
      body.password,
      body.confirm_password,
      resolveLang(lang),
    );
  }
}
