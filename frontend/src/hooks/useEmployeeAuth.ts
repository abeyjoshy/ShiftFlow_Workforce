import { useContext } from 'react';

import { EmployeeAuthContext } from '../context/EmployeeAuthContext';

export function useEmployeeAuth() {
  const ctx = useContext(EmployeeAuthContext);
  if (!ctx) throw new Error('useEmployeeAuth must be used within EmployeeAuthProvider');
  return ctx;
}

