import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { apiRegister } from '../api/auth';
import { storeToken } from '../api/apiClient';
import { useAuth } from '../hooks/useAuth';

export function RegisterPage() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [orgName, setOrgName] = useState('Demo Corp');
  const [industry, setIndustry] = useState<
    'Restaurant' | 'Retail' | 'Healthcare' | 'Corporate Office' | 'Warehouse / Logistics'
  >('Restaurant');
  const [firstName, setFirstName] = useState('Owner');
  const [lastName, setLastName] = useState('User');
  const [email, setEmail] = useState('owner@demo.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (!orgName.trim()) throw new Error('Organization name is required');
      if (!industry) throw new Error('Industry is required');
      const res = await apiRegister({ orgName, industry, firstName, lastName, email, password });
      if (!res.success) throw new Error(res.message ?? 'Registration failed');
      storeToken(res.data.token);
      updateUser(res.data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="authPage">
      <form className="authCard authCard--wide" onSubmit={onSubmit}>
        <h1 className="authTitle">Create your workspace</h1>
        <p className="authSubtitle">Set up your organization and owner account in one step.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: 12, color: 'var(--text-secondary)' }}>Organization</div>
            <label className="formLabel" htmlFor="reg-org">
              Name
            </label>
            <input id="reg-org" className="input" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />

            <label className="formLabel" htmlFor="reg-industry" style={{ marginTop: 14 }}>
              Industry
            </label>
            <select
              id="reg-industry"
              className="input"
              value={industry}
              onChange={(e) =>
                setIndustry(
                  e.target.value as
                    | 'Restaurant'
                    | 'Retail'
                    | 'Healthcare'
                    | 'Corporate Office'
                    | 'Warehouse / Logistics',
                )
              }
              required
            >
              <option value="Restaurant">Restaurant</option>
              <option value="Retail">Retail</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Corporate Office">Corporate Office</option>
              <option value="Warehouse / Logistics">Warehouse / Logistics</option>
            </select>
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: 12, color: 'var(--text-secondary)' }}>Your account</div>
            <label className="formLabel" htmlFor="reg-fn">
              First name
            </label>
            <input id="reg-fn" className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />

            <label className="formLabel" htmlFor="reg-ln" style={{ marginTop: 14 }}>
              Last name
            </label>
            <input id="reg-ln" className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />

            <label className="formLabel" htmlFor="reg-email" style={{ marginTop: 14 }}>
              Email
            </label>
            <input
              id="reg-email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="email"
            />

            <label className="formLabel" htmlFor="reg-pw" style={{ marginTop: 14 }}>
              Password
            </label>
            <input
              id="reg-pw"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        {error ? <div className="alert alert--error">{error}</div> : null}

        <button type="submit" className="btnPrimary" disabled={isSubmitting} style={{ marginTop: 20 }}>
          {isSubmitting ? 'Creating…' : 'Create organization'}
        </button>

        <div className="authFooter">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
