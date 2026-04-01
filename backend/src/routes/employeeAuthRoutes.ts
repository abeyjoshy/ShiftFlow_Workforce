import { Router } from 'express';
import { body } from 'express-validator';

import { authMiddleware } from '../middleware/authMiddleware';
import { employeeLogin, employeeMe, employeeLogout } from '../controllers/employeeAuthController';
import { validate } from '../utils/validate';

export const employeeAuthRouter = Router();

employeeAuthRouter.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').isString().isLength({ min: 1 })],
  validate,
  employeeLogin,
);

employeeAuthRouter.post('/logout', authMiddleware, employeeLogout);
employeeAuthRouter.get('/me', authMiddleware, employeeMe);

