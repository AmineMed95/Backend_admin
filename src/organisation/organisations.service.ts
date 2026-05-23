// src/organisation/organisations.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { Organisation } from './organisation.entity';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { User } from '../users/user.entity';           

@Injectable()
export class OrganisationsService {
  constructor(
    @InjectRepository(Organisation)
    private readonly organisationRepo: Repository<Organisation>,
        
    @InjectRepository(User)                            
    private readonly userRepo: Repository<User>,
  ) {}

  // ─── CREATE ───────────────────────────────────────────────────────────────

  async create(
    dto: CreateOrganisationDto,
    logoPath?: string,
  ): Promise<Organisation> {
    const existing = await this.organisationRepo.findOne({
      where: { name_organisation: dto.name_organisation },
    });

    if (existing) {
      if (logoPath) await this.deleteLogo(logoPath);
      throw new ConflictException('Organisation name already exists');
    }

    const organisation = this.organisationRepo.create({
      name_organisation: dto.name_organisation,
      adresse_organisation: dto.adresse_organisation,
      phone_organisation: dto.phone_organisation,
      logo_organisation: logoPath ?? undefined,   // undefined instead of null — avoids DeepPartial type conflict
    });

    return this.organisationRepo.save(organisation) as Promise<Organisation>;
  }

  // ─── LIST ─────────────────────────────────────────────────────────────────

  async findAll(): Promise<Organisation[]> {
    return this.organisationRepo.find({ order: { created_at: 'DESC' } });
  }

  // ─── GET ONE ──────────────────────────────────────────────────────────────

  async findOne(id: number): Promise<Organisation> {
    const organisation = await this.organisationRepo.findOne({ where: { id } });
    if (!organisation) {
      throw new NotFoundException(`Organisation #${id} not found`);
    }
    return organisation;
  }

  async findByName(name: string): Promise<Organisation | null> {
    return this.organisationRepo.findOne({
      where: { name_organisation: name },
    });
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────

  async update(
    id: number,
    dto: UpdateOrganisationDto,
    logoPath?: string,
  ): Promise<Organisation> {
    const organisation = await this.findOne(id);

    if (
      dto.name_organisation &&
      dto.name_organisation !== organisation.name_organisation
    ) {
      const nameExists = await this.organisationRepo.findOne({
        where: { name_organisation: dto.name_organisation },
      });
      if (nameExists) {
        if (logoPath) await this.deleteLogo(logoPath);
        throw new ConflictException('Organisation name already exists');
      }
    }

    // Delete old logo from disk if a new one is being uploaded
    if (logoPath && organisation.logo_organisation) {
      await this.deleteLogo(organisation.logo_organisation);
    }

    if (dto.name_organisation !== undefined)
      organisation.name_organisation = dto.name_organisation;
    if (dto.adresse_organisation !== undefined)
      organisation.adresse_organisation = dto.adresse_organisation;
    if (dto.phone_organisation !== undefined)
      organisation.phone_organisation = dto.phone_organisation;
    if (logoPath !== undefined)
      organisation.logo_organisation = logoPath;

    return this.organisationRepo.save(organisation) as Promise<Organisation>;
  }

  // ─── DELETE ───────────────────────────────────────────────────────────────

  async remove(id: number): Promise<{ message: string }> {
    const organisation = await this.findOne(id);

    // Block deletion if any admin is still linked to this organisation
    const linkedAdminsCount = await this.userRepo.count({
      where: { organisation: { id } },
    });

    if (linkedAdminsCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer cette organisation : ${linkedAdminsCount} admin${linkedAdminsCount > 1 ? 's sont associés' : ' est associé'} à cette organisation.`,
      );
    }

    if (organisation.logo_organisation) {
      await this.deleteLogo(organisation.logo_organisation);
    }

    await this.organisationRepo.remove(organisation);
    return { message: `Organisation #${id} deleted successfully` };
  }

  // ─── HELPER ───────────────────────────────────────────────────────────────

  private async deleteLogo(filePath: string): Promise<void> {
    try {
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    } catch {
      console.warn(`Could not delete logo file: ${filePath}`);
    }
  }
  
}