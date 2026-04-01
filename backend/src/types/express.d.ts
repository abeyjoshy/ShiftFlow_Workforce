import type { Request } from 'express';

export type AdminRole = 'owner' | 'manager';
export type EmployeeRole = 'employee';

export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  role: AdminRole;
}

export interface AuthenticatedEmployee {
  id: string;
  organizationId: string;
  role: EmployeeRole;
  departmentId?: string;
  positionId?: string;
}

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Request extends Request {
      user?: AuthenticatedUser;
      employee?: AuthenticatedEmployee;
    }
  }
}

