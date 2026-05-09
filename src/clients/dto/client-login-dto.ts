import { IsString, IsOptional, IsEmail, ValidateIf } from 'class-validator';
 
export class ClientLoginDto {
  @IsOptional()
  @IsEmail()
  email?: string;
 
  @IsOptional()
  @IsString()
  phone?: string;
 
  @IsString()
  access_code: string;
}
 