import type { NextFunction, Request, Response } from 'express';

import { getEnv } from '../config/env';
import { verifyAuthToken } from '../utils/token';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const header = req.header('Authorization') ?? '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const env = getEnv();
    const payload = verifyAuthToken(token, env.jwtSecret);

    if (payload.subjectType === 'user') {
      req.user = { id: payload.userId, organizationId: payload.organizationId, role: payload.role };
    } else {
      req.employee = {
        id: payload.employeeId,
        organizationId: payload.organizationId,
        role: 'employee',
        departmentId: payload.departmentId,
        positionId: payload.positionId,
      };
    }
    next();
  } catch (err) {
    next(err);
  }
}

