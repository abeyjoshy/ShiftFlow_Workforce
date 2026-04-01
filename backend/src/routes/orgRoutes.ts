import { Router } from 'express';
import { body } from 'express-validator';

import { authMiddleware } from '../middleware/authMiddleware';
import { roleMiddleware } from '../middleware/roleMiddleware';
import { getOrg, getOrgStats, updateOrg } from '../controllers/orgController';
import { getOrgStructure } from '../controllers/orgStructureController';
import { validate } from '../utils/validate';

export const orgRouter = Router();

orgRouter.get('/', authMiddleware, getOrg);
orgRouter.get('/structure', authMiddleware, getOrgStructure);

orgRouter.put(
  '/',
  authMiddleware,
  roleMiddleware(['owner']),
  [
    body('name').optional().isString().trim().isLength({ min: 2, max: 120 }),
    body('settings').optional().isObject(),
    body('settings.timezone').optional().isString().trim().isLength({ min: 1, max: 80 }),
    body('settings.weekStartDay').optional().isInt({ min: 0, max: 6 }).toInt(),
    body('settings.maxShiftHours').optional().isInt({ min: 1, max: 24 }).toInt(),
  ],
  validate,
  updateOrg,
);

orgRouter.get('/stats', authMiddleware, getOrgStats);

