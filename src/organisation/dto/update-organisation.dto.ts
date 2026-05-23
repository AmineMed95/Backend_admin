// update-organisation.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class UpdateOrganisationDto {
  @IsString()
  @IsOptional()
  name_organisation?: string;

  @IsString()
  @IsOptional()
  adresse_organisation?: string;

  @IsString()
  @IsOptional()
  phone_organisation?: string;

  // logo_organisation is NOT in the DTO — it comes from the uploaded file (multer)
}