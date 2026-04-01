import { Router } from 'express';
import { body, param, query } from 'express-validator';

import { authMiddleware } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/requireAdmin';
import { requireEmployee } from '../middleware/requireEmployee';
import {
  approveSwap,
  acceptSwap,
  cancelSwap,
  createSwap,
  declineSwap,
  getSwap,
  listSwaps,
  rejectSwap,
} from '../controllers/swapController';
import { validate } from '../utils/validate';

export const swapsRouter = Router();

swapsRouter.get(
  '/',
  authMiddleware,
  [
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'cancelled']),
    query('targetStatus').optional().isIn(['pending', 'accepted', 'declined']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  listSwaps,
);

swapsRouter.post(
  '/',
  authMiddleware,
  requireEmployee,
  [
    body('requestedShiftId').isMongoId(),
    body('targetEmployeeId').isMongoId(),
    body('offeredShiftId').optional().isMongoId(),
    body('requesterNote').optional().isString().trim().isLength({ min: 1, max: 2000 }),
  ],
  validate,
  createSwap,
);

swapsRouter.get('/:id', authMiddleware, [param('id').isMongoId()], validate, getSwap);

swapsRouter.put(
  '/:id/approve',
  authMiddleware,
  requireAdmin(['owner', 'manager']),
  [param('id').isMongoId(), body('managerNote').optional().isString().trim().isLength({ min: 1, max: 2000 })],
  validate,
  approveSwap,
);

swapsRouter.put(
  '/:id/reject',
  authMiddleware,
  requireAdmin(['owner', 'manager']),
  [param('id').isMongoId(), body('managerNote').optional().isString().trim().isLength({ min: 1, max: 2000 })],
  validate,
  rejectSwap,
);

swapsRouter.put('/:id/accept', authMiddleware, requireEmployee, [param('id').isMongoId()], validate, acceptSwap);
swapsRouter.put('/:id/decline', authMiddleware, requireEmployee, [param('id').isMongoId()], validate, declineSwap);

swapsRouter.put('/:id/cancel', authMiddleware, requireEmployee, [param('id').isMongoId()], validate, cancelSwap);

