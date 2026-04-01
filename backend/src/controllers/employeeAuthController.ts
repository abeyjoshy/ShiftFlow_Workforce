import bcrypt from 'bcrypt';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { getEnv } from '../config/env';
import { EmployeeModel } from '../models';
import { ok } from '../utils/api';

function signEmployeeToken(payload: {
  subjectType: 'employee';
  employeeId: string;
  organizationId: string;
  role: 'employee';
  departmentId?: string;
  positionId?: string;
}): string {
  const env = getEnv();
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as unknown as jwt.SignOptions['expiresIn'],
  });
}

export async function employeeLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as Record<string, unknown>;
    const emailStr = String(email).toLowerCase();

    const employee = await EmployeeModel.findOne({ email: emailStr, isActive: true, canLogin: true }).select(
      '+passwordHash organizationId departmentId positionId firstName lastName email isActive canLogin lastLogin',
    );
    if (!employee || !employee.passwordHash) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const okPassword = await bcrypt.compare(String(password), employee.passwordHash);
    if (!okPassword) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    employee.lastLogin = new Date();
    await employee.save();

    const token = signEmployeeToken({
      subjectType: 'employee',
      employeeId: employee._id.toString(),
      organizationId: employee.organizationId.toString(),
      role: 'employee',
      departmentId: employee.departmentId?.toString?.(),
      positionId: employee.positionId?.toString?.(),
    });

    res.json(
      ok({
        token,
        employee: {
          _id: employee._id.toString(),
          organizationId: employee.organizationId.toString(),
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          departmentId: employee.departmentId?.toString?.(),
          positionId: employee.positionId?.toString?.(),
        },
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function employeeLogout(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok({}));
  } catch (err) {
    next(err);
  }
}

export async function employeeMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.employee) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const employee = await EmployeeModel.findOne({
      _id: req.employee.id,
      organizationId: req.employee.organizationId,
      isActive: true,
    }).lean();
    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found' });
      return;
    }
    res.json(ok(employee));
  } catch (err) {
    next(err);
  }
}

