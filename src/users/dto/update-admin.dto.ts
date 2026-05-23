import { Type } from 'class-transformer';
import { IsString, IsOptional, IsEmail, IsInt, IsPositive } from 'class-validator';

export class UpdateAdminDto {
  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsOptional()
  @Type(() => Number)     
  @IsInt()
  @IsPositive()
  organisation_id?: number;
}