// create-organisation.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateOrganisationDto {
  @IsString()
  @IsNotEmpty()
  name_organisation: string;

  @IsString()
  @IsOptional()
  adresse_organisation?: string;

  @IsString()
  @IsOptional()
  phone_organisation?: string;

  // logo_organisation is NOT in the DTO — it comes from the uploaded file (multer)
}