import { IsEmail, IsInt, IsIn } from 'class-validator';

export class ResendAccessCodeDto {
  @IsEmail()
  email: string;

  @IsInt()
  @IsIn([1, 2], { message: 'send_via must be 1 (email) or 2 (SMS)' })
  send_via: number;
}