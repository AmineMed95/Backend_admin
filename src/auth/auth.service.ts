import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UserStatus } from '../users/userstatus.entity';
import { EmailService } from '../mail/mail.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserStatus)
    private readonly statusRepo: Repository<UserStatus>,
    private emailService: EmailService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const allowedRoles = ['admin', 'super_admin'];
    if (!allowedRoles.includes(user.role.name)) {
      throw new UnauthorizedException('Access denied');
    }

    if (user.role.name === 'admin' && user.activation_token !== null) {
      throw new UnauthorizedException(
        "Votre compte n'est pas encore activé. Veuillez vérifier votre email.",
      );
    }

    return {
      access_token: this.jwtService.sign({
        userId: user.id,
        role: user.role.name,
        email: user.email,
      }),
    };
  }

  async logout(user: any) {
    return { message: 'Logged out successfully' };
  }

  async activateAccount(token: string) {
    const user = await this.userRepo.findOne({
      where: { activation_token: token },
    });
    if (!user) {
      throw new BadRequestException('Invalid token');
    }
    const activeStatus = await this.statusRepo.findOne({
      where: { code: 'actif' },
    });
    if (!activeStatus) {
      throw new BadRequestException('Active status not found');
    }
    user.status = activeStatus;
    user.activation_token = null;
    await this.userRepo.save(user);
    return { message: 'Account activated successfully' };
  }

  // 👇 Step 1 — Generate token and send email
  async forgotPassword(email: string) {
    const user = await this.userRepo.findOne({
      where: { email },
      relations: ['role'],
    });

    if (!user) {
      throw new BadRequestException('Email non trouvé');
    }

    // Generate reset token valid for 1 hour
    const token = randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    user.reset_password_token = token;
    user.reset_password_expires = expires;
    await this.userRepo.save(user);

    await this.emailService.sendPasswordResetEmail(user.email, token);

    return { message: 'Email de réinitialisation envoyé' };
  }

  async resetPassword(token: string, newPassword: string, confirmPassword: string) {
    // 👇 Check passwords match
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Les mots de passe ne correspondent pas');
    }

    const user = await this.userRepo.findOne({
      where: { reset_password_token: token },
    });

    if (!user) {
      throw new BadRequestException('Lien invalide ou expiré');
    }

    if (!user.reset_password_expires || user.reset_password_expires < new Date()) {
      throw new BadRequestException('Lien expiré. Veuillez faire une nouvelle demande.');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.reset_password_token = null;
    user.reset_password_expires = null;
    await this.userRepo.save(user);

    return { message: 'Mot de passe mis à jour avec succès' };
  }
}