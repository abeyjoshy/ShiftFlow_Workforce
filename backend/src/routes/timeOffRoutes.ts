import { Router } from 'express';
import { body, param, query } from 'express-validator';

import { authMiddleware } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/requireAdmin';
import { requireEmployee } from '../middleware/requireEmployee';
import {
  approveTimeOff,
  cancelTimeOff,
  createSickRequest,
  listTimeOff,
  rejectTimeOff,
} from '../controllers/timeOffController';
import { validate } from '../utils/validate';

export const timeOffRouter = Router();

timeOffRouter.get(
  '/',
  authMiddleware,
  [
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'cancelled']),
    query('type').optional().isIn(['sick']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  listTimeOff,
);

timeOffRouter.post(
  '/sick',
  authMiddleware,
  requireEmployee,
  [
    body('startDate').isISO8601().toDate(),
    body('endDate').isISO8601().toDate(),
    body('note').optional().isString().trim().isLength({ min: 1, max: 2000 }),
  ],
  validate,
  createSickRequest,
);

timeOffRouter.put('/:id/cancel', authMiddleware, requireEmployee, [param('id').isMongoId()], validate, cancelTimeOff);

timeOffRouter.put(
  '/:id/approve',
  authMiddleware,
  requireAdmin(['owner', 'manager']),
  [param('id').isMongoId(), body('managerNote').optional().isString().trim().isLength({ min: 1, max: 2000 })],
  validate,
  approveTimeOff,
);

timeOffRouter.put(
  '/:id/reject',
  authMiddleware,
  requireAdmin(['owner', 'manager']),
  [param('id').isMongoId(), body('managerNote').optional().isString().trim().isLength({ min: 1, max: 2000 })],
  validate,
  rejectTimeOff,
);

