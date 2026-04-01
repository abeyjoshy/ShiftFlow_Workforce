import { Router } from 'express';
import { param, query } from 'express-validator';

import { authMiddleware } from '../middleware/authMiddleware';
import {
  deleteNotification,
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
} from '../controllers/notificationController';
import { validate } from '../utils/validate';

export const notificationsRouter = Router();

notificationsRouter.get(
  '/',
  authMiddleware,
  [query('page').optional().isInt({ min: 1 }).toInt(), query('limit').optional().isInt({ min: 1, max: 100 }).toInt()],
  validate,
  listNotifications,
);

notificationsRouter.put('/:id/read', authMiddleware, [param('id').isMongoId()], validate, markRead);
notificationsRouter.put('/read-all', authMiddleware, markAllRead);
notificationsRouter.delete('/:id', authMiddleware, [param('id').isMongoId()], validate, deleteNotification);
notificationsRouter.get('/unread-count', authMiddleware, unreadCount);

