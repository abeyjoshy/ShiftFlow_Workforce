import { Router } from 'express';

import { authMiddleware } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/requireAdmin';
import { onShiftNow } from '../controllers/monitoringController';

export const monitoringRouter = Router();

monitoringRouter.get('/on-shift', authMiddleware, requireAdmin(['owner', 'manager']), onShiftNow);

