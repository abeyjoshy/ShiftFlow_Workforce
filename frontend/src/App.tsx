import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import './App.css';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { WeeklySchedulePage } from './pages/WeeklySchedulePage';
import { CreateShiftPage } from './pages/CreateShiftPage';
import { EmployeeListPage } from './pages/EmployeeListPage';
import { EmployeeDetailPage } from './pages/EmployeeDetailPage';
import { AddEmployeePage } from './pages/AddEmployeePage';
import { SwapRequestsPage } from './pages/SwapRequestsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { OrgSettingsPage } from './pages/OrgSettingsPage';
import { MySchedulePage } from './pages/MySchedulePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { EmployeeLoginPage } from './pages/EmployeeLoginPage';
import { EmployeeDashboardPage } from './pages/EmployeeDashboardPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { TimeOffRequestsPage } from './pages/TimeOffRequestsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/employee-login" element={<EmployeeLoginPage />} />
      <Route path="/employee-dashboard" element={<EmployeeDashboardPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/swaps" element={<SwapRequestsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={['owner', 'manager']} />}>
        <Route path="/schedule" element={<WeeklySchedulePage />} />
        <Route path="/schedule/new" element={<CreateShiftPage />} />
        <Route path="/employees" element={<EmployeeListPage />} />
        <Route path="/employees/new" element={<AddEmployeePage />} />
        <Route path="/employees/:id" element={<EmployeeDetailPage />} />
        <Route path="/monitoring" element={<MonitoringPage />} />
        <Route path="/time-off" element={<TimeOffRequestsPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={['owner']} />}>
        <Route path="/settings" element={<OrgSettingsPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={['employee']} />}>
        <Route path="/my-schedule" element={<MySchedulePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
