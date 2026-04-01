import { Router } from 'express';
import { body, param, query } from 'express-validator';

import { authMiddleware } from '../middleware/authMiddleware';
import { requireEmployee } from '../middleware/requireEmployee';
import { roleMiddleware } from '../middleware/roleMiddleware';
import {
  bulkCreateShifts,
  createShift,
  employeeClockIn,
  employeeClockOut,
  deleteShift,
  getShift,
  listShifts,
  publishShift,
  publishWeek,
  updateShift,
  weekSchedule,
} from '../controllers/shiftController';
import { validate } from '../utils/validate';

export const shiftsRouter = Router();

shiftsRouter.get(
  '/',
  authMiddleware,
  [
    query('employeeId').optional().isMongoId(),
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate(),
    query('status').optional().isIn(['draft', 'published', 'completed', 'cancelled']),
    query('department').optional().isString().trim(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  listShifts,
);

shiftsRouter.post(
  '/',
  authMiddleware,
  roleMiddleware(['owner', 'manager']),
  [
    body('employeeId').isMongoId(),
    body('date').isISO8601().toDate(),
    body('startTime').isString().trim().isLength({ min: 1, max: 10 }),
    body('endTime').isString().trim().isLength({ min: 1, max: 10 }),
    body('position').isString().trim().isLength({ min: 1, max: 120 }),
    body('location').optional().isString().trim().isLength({ min: 1, max: 120 }),
    body('status').optional().isIn(['draft', 'published', 'completed', 'cancelled']),
    body('notes').optional().isString().trim().isLength({ min: 1, max: 2000 }),
  ],
  validate,
  createShift,
);

shiftsRouter.post(
  '/bulk',
  authMiddleware,
  roleMiddleware(['owner', 'manager']),
  [
    body('shifts').isArray({ min: 1 }),
    body('shifts.*.employeeId').isMongoId(),
    body('shifts.*.date').isISO8601().toDate(),
    body('shifts.*.startTime').isString().trim().isLength({ min: 1, max: 10 }),
    body('shifts.*.endTime').isString().trim().isLength({ min: 1, max: 10 }),
    body('shifts.*.position').isString().trim().isLength({ min: 1, max: 120 }),
    body('shifts.*.location').optional().isString().trim().isLength({ min: 1, max: 120 }),
    body('shifts.*.status').optional().isIn(['draft', 'published', 'completed', 'cancelled']),
    body('shifts.*.notes').optional().isString().trim().isLength({ min: 1, max: 2000 }),
  ],
  validate,
  bulkCreateShifts,
);

shiftsRouter.get('/schedule/week', authMiddleware, [query('weekStart').isISO8601().toDate()], validate, weekSchedule);

shiftsRouter.post(
  '/publish-week',
  authMiddleware,
  roleMiddleware(['owner', 'manager']),
  [body('weekStart').isISO8601().toDate()],
  validate,
  publishWeek,
);

shiftsRouter.get('/:id', authMiddleware, [param('id').isMongoId()], validate, getShift);

shiftsRouter.put(
  '/:id/clock-in',
  authMiddleware,
  requireEmployee,
  [param('id').isMongoId()],
  validate,
  employeeClockIn,
);

shiftsRouter.put(
  '/:id/clock-out',
  authMiddleware,
  requireEmployee,
  [param('id').isMongoId()],
  validate,
  employeeClockOut,
);

shiftsRouter.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['owner', 'manager']),
  [
    param('id').isMongoId(),
    body('date').optional().isISO8601().toDate(),
    body('startTime').optional().isString().trim().isLength({ min: 1, max: 10 }),
    body('endTime').optional().isString().trim().isLength({ min: 1, max: 10 }),
    body('position').optional().isString().trim().isLength({ min: 1, max: 120 }),
    body('location').optional().isString().trim().isLength({ min: 1, max: 120 }),
    body('status').optional().isIn(['draft', 'published', 'completed', 'cancelled']),
    body('notes').optional().isString().trim().isLength({ min: 1, max: 2000 }),
    body('actualStartTime').optional().isString().trim().isLength({ min: 1, max: 10 }),
    body('actualEndTime').optional().isString().trim().isLength({ min: 1, max: 10 }),
  ],
  validate,
  updateShift,
);

shiftsRouter.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['owner', 'manager']),
  [param('id').isMongoId()],
  validate,
  deleteShift,
);

shiftsRouter.put(
  '/:id/publish',
  authMiddleware,
  roleMiddleware(['owner', 'manager']),
  [param('id').isMongoId()],
  validate,
  publishShift,
);

