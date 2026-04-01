import type { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';

export function validate(req: Request, res: Response, next: NextFunction): void {
  const result = validationResult(req);
  if (result.isEmpty()) {
    next();
    return;
  }
  res.status(400).json({
    success: false,
    data: null,
    message: 'Validation failed',
    errors: result.array(),
  });
}

