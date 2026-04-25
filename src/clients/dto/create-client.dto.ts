import { IsEmail, IsNotEmpty, IsOptional, IsString, IsIn, IsNumber } from 'class-validator';

export class CreateClientDto {
  @IsNotEmpty()
  @IsString()
  first_name: string;

  @IsNotEmpty()
  @IsString()
  last_name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNotEmpty()
  @IsNumber()
  @IsIn([1, 2])  // 1 = email, 2 = sms
  send_via: number;
}