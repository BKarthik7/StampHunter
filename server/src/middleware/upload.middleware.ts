import multer from 'multer';
import { Errors } from '../lib/errors.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const upload = multer({
  storage: multer.memoryStorage(), // keep in memory — we pipe to Cloudinary
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Errors.invalidFileType() as unknown as null, false);
    }
  },
});

// Multer error → our error shape
export function handleMulterError(err: Error, _req: unknown, _res: unknown, next: Function) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(Errors.fileTooLarge());
    }
  }
  next(err);
}
