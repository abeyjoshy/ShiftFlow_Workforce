import { Router } from 'express';
import { body } from 'express-validator';

import { authMiddleware } from '../middleware/authMiddleware';
import {
  changePassword,
  getMe,
  login,
  logout,
  register,
} from '../controllers/authController';
import { validate } from '../utils/validate';

export const authRouter = Router();

authRouter.post(
  '/register',
  [
    body('orgName').isString().trim().isLength({ min: 2, max: 120 }),
    body('industry')
      .isString()
      .trim()
      .isIn(['Restaurant', 'Retail', 'Healthcare', 'Corporate Office', 'Warehouse / Logistics']),
    body('firstName').isString().trim().isLength({ min: 1, max: 80 }),
    body('lastName').isString().trim().isLength({ min: 1, max: 80 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 8, max: 200 }),
  ],
  validate,
  register,
);

authRouter.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').isString().isLength({ min: 1 })],
  validate,
  login,
);

authRouter.post('/logout', authMiddleware, logout);
authRouter.get('/me', authMiddleware, getMe);

authRouter.put(
  '/change-password',
  authMiddleware,
  [
    body('currentPassword').isString().isLength({ min: 1 }),
    body('newPassword').isString().isLength({ min: 8, max: 200 }),
  ],
  validate,
  changePassword,
);

