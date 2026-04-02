import bcrypt from 'bcrypt';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import slugify from 'slugify';

import { getEnv } from '../config/env';
import { DepartmentModel, OrganizationModel, PositionModel, UserModel } from '../models';
import { ok } from '../utils/api';
import { getIndustryPresets, isIndustry, type Industry } from '../utils/presets';

function signToken(payload: { subjectType: 'user'; userId: string; organizationId: string; role: string }): string {
  const env = getEnv();
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as unknown as jwt.SignOptions['expiresIn'],
  });
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name, { lower: true, strict: true, trim: true });
  let slug = base || `org-${Date.now()}`;
  // Try base first then add suffixes.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await OrganizationModel.findOne({ slug }).select('_id').lean();
    if (!existing) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const env = getEnv();
    const { orgName, industry, firstName, lastName, email, password } = req.body as Record<string, unknown>;

    const emailStr = String(email).toLowerCase();
    const existing = await UserModel.findOne({ email: emailStr }).select('_id').lean();
    if (existing) {
      res.status(409).json({ success: false, message: 'Email already registered' });
      return;
    }

    const industryValue: Industry = isIndustry(industry) ? industry : 'Restaurant';
    const slug = await generateUniqueSlug(String(orgName));
    const org = await OrganizationModel.create({
      name: String(orgName),
      slug,
      industry: industryValue,
      plan: 'free',
      settings: {},
    });

    const preset = getIndustryPresets(industryValue);
    for (const d of preset) {
      const dept = await DepartmentModel.create({ organizationId: org._id, name: d.name });
      for (const p of d.positions) {
        await PositionModel.create({ organizationId: org._id, departmentId: dept._id, name: p });
      }
    }

    const passwordHash = await bcrypt.hash(String(password), env.bcryptRounds);
    const user = await UserModel.create({
      organizationId: org._id,
      email: emailStr,
      passwordHash,
      role: 'owner',
      firstName: String(firstName),
      lastName: String(lastName),
      isActive: true,
    });

    const token = signToken({
      subjectType: 'user',
      userId: user._id.toString(),
      organizationId: org._id.toString(),
      role: user.role,
    });

    res.json(
      ok({
        token,
        user: {
          _id: user._id.toString(),
          organizationId: org._id.toString(),
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as Record<string, unknown>;
    const emailStr = String(email).toLowerCase();

    const user = await UserModel.findOne({ email: emailStr }).select('+passwordHash');
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'Invalid credentials from CI/CD' });
      return;
    }

    const okPassword = await bcrypt.compare(String(password), user.passwordHash);
    if (!okPassword) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    user.lastLogin = new Date();
    await user.save();

    const token = signToken({
      subjectType: 'user',
      userId: user._id.toString(),
      organizationId: user.organizationId.toString(),
      role: user.role,
    });

    res.json(
      ok({
        token,
        user: {
          _id: user._id.toString(),
          organizationId: user.organizationId.toString(),
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok({}));
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organizationId;
    if (!userId || !organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await UserModel.findOne({ _id: userId, organizationId }).lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json(ok(user));
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const env = getEnv();
    const userId = req.user?.id;
    const organizationId = req.user?.organizationId;
    if (!userId || !organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { currentPassword, newPassword } = req.body as Record<string, unknown>;
    const user = await UserModel.findOne({ _id: userId, organizationId }).select('+passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const okPassword = await bcrypt.compare(String(currentPassword), user.passwordHash);
    if (!okPassword) {
      res.status(400).json({ success: false, message: 'Current password is incorrect' });
      return;
    }

    user.passwordHash = await bcrypt.hash(String(newPassword), env.bcryptRounds);
    await user.save();

    res.json(ok({}));
  } catch (err) {
    next(err);
  }
}

