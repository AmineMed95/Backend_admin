// src/organisation/organisations.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OrganisationsService } from './organisations.service';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { logoMulterOptions } from './multer.config';
import { Multer } from 'multer';

@Controller('organisations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class OrganisationsController {
  constructor(private readonly organisationsService: OrganisationsService) {}

  // POST /create  (multipart/form-data)
 @Post('create') 
 @UseInterceptors(FileInterceptor('logo_organisation', logoMulterOptions))
  create(
    @Body() dto: CreateOrganisationDto,
    @UploadedFile() file: Multer.File,
  ) {
    return this.organisationsService.create(dto, file?.path);
  }

  // GET /get-list
  @Get('get-list')
  findAll() {
    return this.organisationsService.findAll();
  }

  // GET /get-organisation/:id
  @Get('get-organisation/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.organisationsService.findOne(id);
  }

  // PATCH /update/:id  (multipart/form-data)
  @Patch('update/:id')
  @UseInterceptors(FileInterceptor('logo_organisation', logoMulterOptions))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrganisationDto,
    @UploadedFile() file: Multer.File,
  ) {
    return this.organisationsService.update(id, dto, file?.path);
  }

  // DELETE /delete/:id
  @Delete('delete/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.organisationsService.remove(id);
  }
}