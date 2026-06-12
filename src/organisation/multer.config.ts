import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const logoMulterOptions = {
  storage: diskStorage({
    destination: './uploads/logos',
    filename: (_req: any, file: any, cb: (error: Error | null, filename: string) => void) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      cb(null, `logo-${unique}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req: any, file: any, cb: (error: Error | null, acceptFile: boolean) => void) => {
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
