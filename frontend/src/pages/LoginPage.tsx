import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { login, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  if (user) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="authPage">
      <form className="authCard" onSubmit={onSubmit}>
        <h1 className="authTitle">Welcome back from git</h1>
        <p className="authSubtitle">Sign in to manage schedules, swaps, and your team.</p>

        <label className="formLabel" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          autoComplete="email"
        />

        <label className="formLabel" htmlFor="login-password" style={{ marginTop: 16 }}>
          Password
        </label>
        <input
          id="login-password"
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

        <div className="authFooter">
          New to ShiftFlow? <Link to="/register">Create an organization</Link>
          <div style={{ marginTop: 10 }}>
            Employee? <Link to="/employee-login">Sign in here</Link>
          </div>
        </div>
      </form>
    </div>
  );
}



// export function LoginPage() {
//   return <div style={{ color: 'black' }}>Login page works</div>;
// }