import { Router } from 'express';

import { authRouter } from './authRoutes';
import { employeeAuthRouter } from './employeeAuthRoutes';
import { employeesRouter } from './employeeRoutes';
import { notificationsRouter } from './notificationRoutes';
import { orgRouter } from './orgRoutes';
import { shiftsRouter } from './shiftRoutes';
import { swapsRouter } from './swapRoutes';
import { monitoringRouter } from './monitoringRoutes';
import { timeOffRouter } from './timeOffRoutes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/employee-auth', employeeAuthRouter);
apiRouter.use('/org', orgRouter);
apiRouter.use('/employees', employeesRouter);
apiRouter.use('/shifts', shiftsRouter);
apiRouter.use('/swaps', swapsRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/monitoring', monitoringRouter);
apiRouter.use('/time-off', timeOffRouter);

