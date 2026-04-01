import { useEffect, useMemo, useState } from 'react';

import { apiGetOrgStructure, type DepartmentDto, type PositionDto } from '../api/orgStructure';

export interface OrgStructureState {
  isLoading: boolean;
  departments: DepartmentDto[];
  positions: PositionDto[];
  departmentNameById: Record<string, string>;
  positionNameById: Record<string, string>;
}

export function useOrgStructure(): OrgStructureState {
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [positions, setPositions] = useState<PositionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setIsLoading(true);
      try {
        const res = await apiGetOrgStructure();
        if (!active) return;
        if (res.success) {
          setDepartments(res.data.departments);
          setPositions(res.data.positions);
        }
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  const departmentNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const d of departments) map[d._id] = d.name;
    return map;
  }, [departments]);

  const positionNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of positions) map[p._id] = p.name;
    return map;
  }, [positions]);

  return { isLoading, departments, positions, departmentNameById, positionNameById };
}

