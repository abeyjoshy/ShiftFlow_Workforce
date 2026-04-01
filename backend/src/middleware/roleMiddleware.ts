import type { NextFunction, Request, Response } from 'express';

import type { AdminRole } from '../types/express';

export function roleMiddleware(roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role;
    if (!role) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!roles.includes(role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

