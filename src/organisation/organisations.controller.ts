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
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OrganisationsService } from './organisations.service';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { logoMulterOptions } from './multer.config';
import { resolveLang } from '../common/utils/lang.util';

@Controller('organisations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class OrganisationsController {
  constructor(private readonly organisationsService: OrganisationsService) {}

  @Post('create')
  @UseInterceptors(FileInterceptor('logo_organisation', logoMulterOptions))
  create(
    @Body() dto: CreateOrganisationDto,
    @UploadedFile() file: Express.Multer.File,
    @Headers('accept-language') lang: string,
  ) {
    return this.organisationsService.create(dto, file?.path, resolveLang(lang));
  }

  @Get('get-list')
  findAll() {
    return this.organisationsService.findAll();
  }

  @Get('get-organisation/:id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Headers('accept-language') lang: string,
  ) {
    return this.organisationsService.findOne(id, resolveLang(lang));
  }

  @Patch('update/:id')
  @UseInterceptors(FileInterceptor('logo_organisation', logoMulterOptions))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrganisationDto,
    @UploadedFile() file: Express.Multer.File,
    @Headers('accept-language') lang: string,
  ) {
    return this.organisationsService.update(id, dto, file?.path, resolveLang(lang));
  }

  @Delete('delete/:id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Headers('accept-language') lang: string,
  ) {
    return this.organisationsService.remove(id, resolveLang(lang));
  }
}
