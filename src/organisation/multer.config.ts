// src/organisation/multer.config.ts
import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import { Options } from 'multer';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // ← 5 MB (was 2 MB)

export const logoMulterOptions: Options = {
  storage: diskStorage({
    destination: './uploads/logos',
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      cb(null, `logo-${unique}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          `Invalid file type "${file.mimetype}". Allowed: jpeg, png, webp, svg`,
        ),
        false,
      );
    }
  },
};