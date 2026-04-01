import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { Types } from 'mongoose';

import { connectDb, disconnectDb } from '../config/db';
import { getEnv } from '../config/env';
import {
  DepartmentModel,
  EmployeeModel,
  NotificationModel,
  OrganizationModel,
  PositionModel,
  ShiftModel,
  SwapRequestModel,
  UserModel,
} from '../models';
import { getIndustryPresets } from '../utils/presets';

dotenv.config();

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function mondayOfCurrentWeekUtc(): Date {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function seed(): Promise<void> {
  const env = getEnv();
  await connectDb();

  // Clean slate for local dev.
  await Promise.all([
    NotificationModel.deleteMany({}),
    SwapRequestModel.deleteMany({}),
    ShiftModel.deleteMany({}),
    EmployeeModel.deleteMany({}),
    UserModel.deleteMany({}),
    OrganizationModel.deleteMany({}),
  ]);

  const org = await OrganizationModel.create({
    name: 'Demo Corp',
    slug: 'demo-corp',
    industry: 'Restaurant',
    plan: 'pro',
    settings: { timezone: 'UTC', weekStartDay: 1, maxShiftHours: 12 },
  });

  const preset = getIndustryPresets('Restaurant');
  const deptMap = new Map<string, Types.ObjectId>();
  const posMap = new Map<string, Types.ObjectId>(); // key: deptName::posName
  for (const d of preset) {
    const dept = await DepartmentModel.create({ organizationId: org._id, name: d.name });
    deptMap.set(d.name, dept._id);
    for (const p of d.positions) {
      const pos = await PositionModel.create({ organizationId: org._id, departmentId: dept._id, name: p });
      posMap.set(`${d.name}::${p}`, pos._id);
    }
  }

  const passwordHash = await bcrypt.hash('password123', env.bcryptRounds);

  const owner = await UserModel.create({
    organizationId: org._id,
    email: 'owner@demo.com',
    passwordHash,
    role: 'owner',
    firstName: 'Demo',
    lastName: 'Owner',
    isActive: true,
    lastLogin: new Date(),
  });

  const manager1 = await UserModel.create({
    organizationId: org._id,
    email: 'manager1@demo.com',
    passwordHash,
    role: 'manager',
    firstName: 'Alex',
    lastName: 'Manager',
    isActive: true,
    lastLogin: new Date(),
  });

  const manager2 = await UserModel.create({
    organizationId: org._id,
    email: 'manager2@demo.com',
    passwordHash,
    role: 'manager',
    firstName: 'Sam',
    lastName: 'Supervisor',
    isActive: true,
    lastLogin: new Date(),
  });

  const names = [
    ['Jamie', 'Murphy'],
    ['Taylor', 'Singh'],
    ['Jordan', 'Kelly'],
    ['Casey', 'Brown'],
    ['Riley', 'Chen'],
    ['Morgan', 'Patel'],
    ['Avery', 'Davis'],
    ['Quinn', 'Lee'],
    ['Cameron', 'Lopez'],
    ['Parker', 'Nguyen'],
  ] as const;

  const employees: Array<{ _id: Types.ObjectId; email: string; firstName: string; lastName: string; departmentName: string; positionName: string }> = [];
  for (let i = 0; i < names.length; i += 1) {
    const [firstName, lastName] = names[i];
    const departmentName = i < 4 ? 'FOH' : i < 8 ? 'BOH' : 'Management';
    const deptPreset = preset.find((d) => d.name === departmentName) ?? preset[0];
    const positionName = pick(deptPreset.positions);
    const departmentId = deptMap.get(departmentName) ?? Array.from(deptMap.values())[0];
    const positionId = posMap.get(`${departmentName}::${positionName}`) ?? Array.from(posMap.values())[0];

    const emp = await EmployeeModel.create({
        organizationId: org._id,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@demo.com`,
        canLogin: i < 3,
        passwordHash: i < 3 ? passwordHash : undefined,
        phone: `+353-87-0000-${String(100 + i)}`,
        departmentId,
        positionId,
        employmentType: i % 3 === 0 ? 'full-time' : i % 3 === 1 ? 'part-time' : 'casual',
        hourlyRate: 12 + (i % 5),
        weeklyHours: i % 2 === 0 ? 40 : 20,
        availability: [
          { day: 1, startTime: '09:00', endTime: '17:00' },
          { day: 2, startTime: '09:00', endTime: '17:00' },
          { day: 3, startTime: '09:00', endTime: '17:00' },
          { day: 4, startTime: '09:00', endTime: '17:00' },
          { day: 5, startTime: '09:00', endTime: '17:00' },
        ],
        isActive: true,
        hireDate: addDays(new Date(), -30 - i * 7),
      });

    employees.push({
      _id: emp._id,
      email: emp.email,
      firstName: emp.firstName,
      lastName: emp.lastName,
      departmentName,
      positionName,
    });
  }

  // Employee portal auth is employee-based now (no User creation).

  const weekStart = mondayOfCurrentWeekUtc();
  const shiftTemplates = [
    { startTime: '07:00', endTime: '15:00' },
    { startTime: '09:00', endTime: '17:00' },
    { startTime: '15:00', endTime: '23:00' },
    { startTime: '17:00', endTime: '23:00' },
  ];

  const shifts = [];
  for (let i = 0; i < 20; i += 1) {
    const employee = pick(employees);
    const dayOffset = i % 7;
    const date = addDays(weekStart, dayOffset);
    const t = pick(shiftTemplates);

    shifts.push(
      await ShiftModel.create({
        organizationId: org._id,
        employeeId: employee._id,
        managerId: pick([owner._id, manager1._id, manager2._id]) as Types.ObjectId,
        date,
        startTime: t.startTime,
        endTime: t.endTime,
        position: employee.positionName,
        location: employee.departmentName === 'BOH' ? 'Kitchen' : 'Main Floor',
        status: i % 3 === 0 ? 'draft' : 'published',
        notes: i % 4 === 0 ? 'Cover break at 12:30.' : undefined,
      }),
    );
  }

  // Create 3 pending swap requests among portal-enabled employees if possible.
  const swapRequests = [];
  const requesterEmployees = employees.slice(0, 3);
  for (let i = 0; i < 3; i += 1) {
    const requester = requesterEmployees[i];
    const target = requesterEmployees[(i + 1) % requesterEmployees.length];
    const requestedShift = shifts.find((s) => s.employeeId.toString() === requester._id.toString()) ?? shifts[0];

    swapRequests.push(
      await SwapRequestModel.create({
        organizationId: org._id,
        requesterId: requester._id,
        requestedShiftId: requestedShift._id,
        targetEmployeeId: target._id,
        offeredShiftId: undefined,
        status: 'pending',
        requesterNote: 'Can you cover this shift? Happy to return the favor next week.',
      }),
    );
  }

  const allUsers = [owner, manager1, manager2];
  for (const u of allUsers) {
    for (let i = 0; i < 5; i += 1) {
      const type = pick([
        'shift_published',
        'swap_request',
        'swap_approved',
        'swap_rejected',
        'shift_reminder',
        'schedule_change',
      ] as const);

      await NotificationModel.create({
        organizationId: org._id,
        userId: u._id,
        type,
        title:
          type === 'shift_published'
            ? 'Shift published'
            : type === 'swap_request'
              ? 'Swap request'
              : type === 'swap_approved'
                ? 'Swap approved'
                : type === 'swap_rejected'
                  ? 'Swap rejected'
                  : type === 'shift_reminder'
                    ? 'Shift reminder'
                    : 'Schedule change',
        message: 'Demo notification generated by seed script.',
        isRead: i % 3 === 0,
        relatedEntity:
          type.startsWith('swap') && swapRequests[0]
            ? { entityType: 'swap', entityId: swapRequests[0]._id }
            : shifts[0]
              ? { entityType: 'shift', entityId: shifts[0]._id }
              : undefined,
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete');
  // eslint-disable-next-line no-console
  console.log('Owner login: owner@demo.com / password123');
  // eslint-disable-next-line no-console
  console.log('Managers: manager1@demo.com / password123, manager2@demo.com / password123');
  // eslint-disable-next-line no-console
  console.log('Employees (portal): jamie.murphy@demo.com / password123 (and next two)');
}

seed()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await disconnectDb();
    } catch {
      // ignore
    }
  });

