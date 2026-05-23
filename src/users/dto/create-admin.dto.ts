import { IsEmail, IsNotEmpty, IsOptional, IsString, IsBoolean, Matches, IsPositive, IsInt } from 'class-validator';

export class CreateAdminDto {

  @IsNotEmpty()
  @IsString()
  first_name: string;

  @IsNotEmpty()
  @IsString()
  last_name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  organisation_id: number;
  
  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9+ ]+$/, {
    message: 'phone must contain only numbers, spaces or +',
  })
  phone: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}