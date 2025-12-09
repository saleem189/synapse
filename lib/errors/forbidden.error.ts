// ================================
// Forbidden Error
// ================================
// Thrown when user doesn't have permission to access a resource

import { AppError } from './base.error';

export class ForbiddenError extends AppError {
  statusCode = 403;
  code = 'FORBIDDEN';

  constructor(message: string = 'Access forbidden', details?: unknown) {
    super(message, details);
  }
}

