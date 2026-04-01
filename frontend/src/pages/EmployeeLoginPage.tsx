import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useEmployeeAuth } from '../hooks/useEmployeeAuth';

export function EmployeeLoginPage() {
  const { login, isLoading, employee } = useEmployeeAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (employee) {
    navigate('/employee-dashboard', { replace: true });
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate('/employee-dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="authPage">
      <form className="authCard" onSubmit={onSubmit}>
        <h1 className="authTitle">Employee portal</h1>
        <p className="authSubtitle">Clock in, view your week, and swap shifts with your team.</p>

        <label className="formLabel" htmlFor="emp-email">
          Email
        </label>
        <input
          id="emp-email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          autoComplete="email"
        />

        <label className="formLabel" htmlFor="emp-password" style={{ marginTop: 16 }}>
          Password
        </label>
        <input
          id="emp-password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          autoComplete="current-password"
        />

        {error ? <div className="alert alert--error">{error}</div> : null}

        <button type="submit" className="btnPrimary btnBlock" disabled={isLoading} style={{ marginTop: 20 }}>
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
