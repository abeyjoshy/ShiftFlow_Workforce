import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import App from './App';
import { AuthProvider } from './context/AuthContext';
import { EmployeeAuthProvider } from './context/EmployeeAuthContext';

test('renders sign-in for unauthenticated users', () => {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <EmployeeAuthProvider>
          <App />
        </EmployeeAuthProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
});
