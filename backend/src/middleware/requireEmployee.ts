import type { NextFunction, Request, Response } from 'express';

export function requireEmployee(req: Request, res: Response, next: NextFunction): void {
  if (!req.employee) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  next();
}

