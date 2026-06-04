import type { Request, Response, NextFunction } from 'express';
import type { ApiError } from '@stamphunter/types';

export interface AppError extends Error {
  statusCode: number;
  code: string;
  field?: string;
}

export function createError(
  statusCode: number,
  code: string,
  message: string,
  field?: string
): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  err.code = code;
  err.field = field;
  return err;
}

// Pre-built common errors
export const Errors = {
  unauthorized: () => createError(401, 'UNAUTHORIZED', 'Authentication required'),
  tokenExpired: () => createError(401, 'TOKEN_EXPIRED', 'Access token has expired'),
  forbidden: () => createError(403, 'FORBIDDEN', 'You do not have permission'),
  notFound: (resource: string) =>
    createError(404, `${resource.toUpperCase()}_NOT_FOUND`, `${resource} not found`),
  stampNotFound: () => createError(404, 'STAMP_NOT_FOUND', 'Stamp not found'),
  userNotFound: () => createError(404, 'USER_NOT_FOUND', 'User not found'),
  albumNotFound: () => createError(404, 'ALBUM_NOT_FOUND', 'Album not found'),
  commentNotFound: () => createError(404, 'COMMENT_NOT_FOUND', 'Comment not found'),
  alreadyLiked: () => createError(409, 'ALREADY_LIKED', 'Already liked this stamp'),
  cannotLikeOwn: () => createError(400, 'CANNOT_LIKE_OWN', 'Cannot like your own stamp'),
  cannotFollowSelf: () => createError(400, 'CANNOT_FOLLOW_SELF', 'Cannot follow yourself'),
  duplicateAlbumStamp: () =>
    createError(409, 'ALREADY_IN_ALBUM', 'Stamp is already in this album'),
  fileTooLarge: () => createError(413, 'FILE_TOO_LARGE', 'File exceeds 20MB limit'),
  invalidFileType: () =>
    createError(415, 'INVALID_FILE_TYPE', 'Only JPEG, PNG and WebP images are accepted'),
  uploadFailed: () => createError(503, 'UPLOAD_FAILED', 'Image upload failed, please try again'),
  validation: (message: string, field?: string) =>
    createError(400, 'VALIDATION_ERROR', message, field),
  internal: () => createError(500, 'INTERNAL_ERROR', 'An unexpected error occurred'),
};

// Global error handler middleware
export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';
  const message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message;

  if (statusCode === 500) {
    console.error('[ERROR]', {
      code,
      message: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });
  }

  const body: ApiError = {
    error: {
      code,
      message,
      ...(err.field ? { field: err.field } : {}),
    },
  };

  res.status(statusCode).json(body);
}
