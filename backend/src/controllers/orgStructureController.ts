import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';

import { DepartmentModel, OrganizationModel, PositionModel } from '../models';
import { ok } from '../utils/api';

export async function getOrgStructure(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const orgId = new Types.ObjectId(organizationId);

    const org = await OrganizationModel.findById(orgId).select('industry').lean();
    if (!org) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    const departments = await DepartmentModel.find({ organizationId: orgId }).sort({ name: 1 }).lean();
    const positions = await PositionModel.find({ organizationId: orgId }).sort({ name: 1 }).lean();

    res.json(ok({ industry: org.industry, departments, positions }));
  } catch (err) {
    next(err);
  }
}

