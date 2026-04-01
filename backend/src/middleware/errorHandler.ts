import type { ErrorRequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import { getEnv } from '../config/env';

function getStatusCode(err: unknown): number {
  if (err instanceof mongoose.Error.ValidationError) return 400;
  if (err instanceof mongoose.Error.CastError) return 400;
  if (err instanceof jwt.JsonWebTokenError) return 401;
  if (err instanceof jwt.TokenExpiredError) return 401;
  return 500;
}

function getMessage(err: unknown): string {
  if (err instanceof mongoose.Error.ValidationError) return err.message;
  if (err instanceof mongoose.Error.CastError) return 'Invalid ID';
  if (err instanceof jwt.TokenExpiredError) return 'Token expired';
  if (err instanceof jwt.JsonWebTokenError) return 'Invalid token';
  if (err instanceof Error && err.message) return err.message;
  return 'Internal server error';
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const env = getEnv();
  const statusCode = getStatusCode(err);
  const message = getMessage(err);

  const payload: { success: false; message: string; stack?: string } = {
    success: false,
    message,
  };

  if (env.nodeEnv !== 'production' && err instanceof Error && err.stack) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

