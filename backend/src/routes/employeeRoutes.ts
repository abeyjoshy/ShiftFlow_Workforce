import { Router } from 'express';
import { body, param, query } from 'express-validator';

import { authMiddleware } from '../middleware/authMiddleware';
import { requireEmployee } from '../middleware/requireEmployee';
import { roleMiddleware } from '../middleware/roleMiddleware';
import {
  createEmployee,
  deactivateEmployee,
  employeeDirectory,
  getEmployee,
  getEmployeeShifts,
  listEmployees,
  updateAvailability,
  updateEmployee,
} from '../controllers/employeeController';
import { validate } from '../utils/validate';

export const employeesRouter = Router();

employeesRouter.get('/directory', authMiddleware, requireEmployee, validate, employeeDirectory);

employeesRouter.get(
  '/',
  authMiddleware,
  roleMiddleware(['owner', 'manager']),
  [
    query('departmentId').optional().isMongoId(),
    query('positionId').optional().isMongoId(),
    query('status').optional().isIn(['active', 'inactive']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  listEmployees,
);

employeesRouter.post(
  '/',
  authMiddleware,
  roleMiddleware(['owner', 'manager']),
  [
    body('firstName').isString().trim().isLength({ min: 1, max: 80 }),
    body('lastName').isString().trim().isLength({ min: 1, max: 80 }),
    body('email').isEmail().normalizeEmail(),
    body('departmentId').isMongoId(),
    body('positionId').isMongoId(),
    body('employmentType').isIn(['full-time', 'part-time', 'casual']),
    body('canLogin').optional().isBoolean().toBoolean(),
    body('password').optional().isString().isLength({ min: 8, max: 200 }),
    body('phone').optional().isString().trim().isLength({ min: 1, max: 40 }),
    body('hourlyRate').optional().isFloat({ min: 0 }).toFloat(),
    body('weeklyHours').optional().isFloat({ min: 0 }).toFloat(),
    body('hireDate').optional().isISO8601().toDate(),
  ],
  validate,
  createEmployee,
);

employeesRouter.get(
  '/:id',
  authMiddleware,
  roleMiddleware(['owner', 'manager']),
  [param('id').isMongoId()],
  validate,
  getEmployee,
);

employeesRouter.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['owner', 'manager']),
  [
    param('id').isMongoId(),
    body('firstName').optional().isString().trim().isLength({ min: 1, max: 80 }),
    body('lastName').optional().isString().trim().isLength({ min: 1, max: 80 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('departmentId').optional().isMongoId(),
    body('positionId').optional().isMongoId(),
    body('employmentType').optional().isIn(['full-time', 'part-time', 'casual']),
    body('canLogin').optional().isBoolean().toBoolean(),
    body('phone').optional().isString().trim().isLength({ min: 1, max: 40 }),
    body('hourlyRate').optional().isFloat({ min: 0 }).toFloat(),
    body('weeklyHours').optional().isFloat({ min: 0 }).toFloat(),
    body('isActive').optional().isBoolean().toBoolean(),
    body('hireDate').optional().isISO8601().toDate(),
  ],
  validate,
  updateEmployee,
);

employeesRouter.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['owner']),
  [param('id').isMongoId()],
  validate,
  deactivateEmployee,
);

employeesRouter.put(
  '/:id/availability',
  authMiddleware,
  roleMiddleware(['owner', 'manager']),
  [
    param('id').isMongoId(),
    body('availability').isArray(),
    body('availability.*.day').isInt({ min: 0, max: 6 }).toInt(),
    body('availability.*.startTime').isString().trim().isLength({ min: 1, max: 10 }),
    body('availability.*.endTime').isString().trim().isLength({ min: 1, max: 10 }),
  ],
  validate,
  updateAvailability,
);

employeesRouter.get(
  '/:id/shifts',
  authMiddleware,
  roleMiddleware(['owner', 'manager']),
  [
    param('id').isMongoId(),
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate(),
    query('status').optional().isIn(['draft', 'published', 'completed', 'cancelled']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  getEmployeeShifts,
);

