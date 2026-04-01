import { Types } from 'mongoose';

export type Industry =
  | 'Restaurant'
  | 'Retail'
  | 'Healthcare'
  | 'Corporate Office'
  | 'Warehouse / Logistics';

export interface PresetDepartmentInput {
  name: string;
  positions: string[];
}

export function getIndustryPresets(industry: Industry): PresetDepartmentInput[] {
  switch (industry) {
    case 'Restaurant':
      return [
        { name: 'FOH', positions: ['Server', 'Host', 'Bartender'] },
        { name: 'BOH', positions: ['Chef', 'Line Cook', 'Dishwasher'] },
        { name: 'Management', positions: ['Manager'] },
      ];
    case 'Retail':
      return [
        { name: 'Sales Floor', positions: ['Associate', 'Cashier'] },
        { name: 'Inventory', positions: ['Stock Clerk'] },
        { name: 'Management', positions: ['Store Manager'] },
      ];
    case 'Healthcare':
      return [
        { name: 'Clinical', positions: ['Nurse', 'Doctor'] },
        { name: 'Admin', positions: ['Receptionist'] },
        { name: 'Support', positions: ['Technician'] },
      ];
    case 'Corporate Office':
      return [
        { name: 'Engineering', positions: ['Developer'] },
        { name: 'HR', positions: ['HR Manager'] },
        { name: 'Sales', positions: ['Sales Rep'] },
      ];
    case 'Warehouse / Logistics':
      return [
        { name: 'Operations', positions: ['Picker', 'Packer'] },
        { name: 'Logistics', positions: ['Driver'] },
        { name: 'Management', positions: ['Supervisor'] },
      ];
  }
}

export function isIndustry(value: unknown): value is Industry {
  return (
    value === 'Restaurant' ||
    value === 'Retail' ||
    value === 'Healthcare' ||
    value === 'Corporate Office' ||
    value === 'Warehouse / Logistics'
  );
}

export function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

