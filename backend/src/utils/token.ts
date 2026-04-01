import jwt, { type JwtPayload } from 'jsonwebtoken';

import type { AdminRole } from '../types/express';

export type SubjectType = 'user' | 'employee';

export interface BaseAuthTokenPayload extends JwtPayload {
  subjectType: SubjectType;
  organizationId: string;
}

export interface UserAuthTokenPayload extends BaseAuthTokenPayload {
  subjectType: 'user';
  userId: string;
  role: AdminRole;
}

export interface EmployeeAuthTokenPayload extends BaseAuthTokenPayload {
  subjectType: 'employee';
  employeeId: string;
  role: 'employee';
  departmentId?: string;
  positionId?: string;
}

export type AuthTokenPayload = UserAuthTokenPayload | EmployeeAuthTokenPayload;

export function verifyAuthToken(token: string, jwtSecret: string): AuthTokenPayload {
  const decoded = jwt.verify(token, jwtSecret);
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid token payload');
  }

  const payload = decoded as Partial<AuthTokenPayload>;
  if (!payload.subjectType || !payload.organizationId) {
    throw new Error('Invalid token payload');
  }

  if (payload.subjectType === 'user') {
    const p = payload as Partial<UserAuthTokenPayload>;
    if (!p.userId || !p.role) throw new Error('Invalid token payload');
    return p as UserAuthTokenPayload;
  }

  if (payload.subjectType === 'employee') {
    const p = payload as Partial<EmployeeAuthTokenPayload>;
    if (!p.employeeId || !p.role) throw new Error('Invalid token payload');
    return p as EmployeeAuthTokenPayload;
  }

  throw new Error('Invalid token payload');
}

