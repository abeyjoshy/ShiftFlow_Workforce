export type UserRole = 'owner' | 'manager' | 'employee';
export type ShiftStatus = 'draft' | 'published' | 'completed' | 'cancelled';
export type SwapStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type SwapTargetStatus = 'pending' | 'accepted' | 'declined';
export type TimeOffType = 'sick';
export type TimeOffStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type NotificationType =
  | 'shift_published'
  | 'swap_request'
  | 'swap_approved'
  | 'swap_rejected'
  | 'shift_reminder'
  | 'schedule_change';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: PaginationMeta;
}

export interface OrganizationSettings {
  timezone: string;
  weekStartDay: number;
  maxShiftHours: number;
}

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  settings: OrganizationSettings;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  organizationId: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface AvailabilityBlock {
  day: number; // 0-6
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export type EmploymentType = 'full-time' | 'part-time' | 'casual';

export interface Employee {
  _id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  canLogin: boolean;
  phone?: string;
  departmentId: string;
  positionId: string;
  employmentType: EmploymentType;
  hourlyRate?: number;
  weeklyHours?: number;
  availability: AvailabilityBlock[];
  isActive: boolean;
  hireDate?: string;
  createdAt: string;
}

export interface Shift {
  _id: string;
  organizationId: string;
  employeeId: string;
  managerId: string;
  date: string; // ISO
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  position: string;
  location?: string;
  status: ShiftStatus;
  notes?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  hoursWorked?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SwapRequest {
  _id: string;
  organizationId: string;
  requesterId: string | Employee;
  requestedShiftId: string | Shift;
  targetEmployeeId: string | Employee;
  offeredShiftId?: string | Shift;
  targetStatus?: SwapTargetStatus;
  targetRespondedAt?: string;
  status: SwapStatus;
  requesterNote?: string;
  managerNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface NotificationRelatedEntity {
  entityType: string;
  entityId: string;
}

export interface Notification {
  _id: string;
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  relatedEntity?: NotificationRelatedEntity;
  createdAt: string;
}

export interface TimeOffRequest {
  _id: string;
  organizationId: string;
  employeeId: string | Employee;
  type: TimeOffType;
  startDate: string;
  endDate: string;
  note?: string;
  status: TimeOffStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  managerNote?: string;
  createdAt: string;
}

