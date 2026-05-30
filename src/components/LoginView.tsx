import React, { useState } from 'react';
import { db, type Intern } from '../db';

interface LoginViewProps {
  onLoginSuccess: (user: Intern) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Find the user by email in our Dexie DB
      const user = await db.interns.where('email').equals(email.trim()).first();

      if (!user) {
        setError('No account found with this email.');
        setLoading(false);
        return;
      }

      if (user.password !== password) {
        setError('Incorrect password. Please try again.');
        setLoading(false);
        return;
      }

      // Success
      onLoginSuccess(user);
    } catch (err) {
      console.error(err);
      setError('Database error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <span>INTERNFLOW</span>
        </div>
        <p className="login-subtitle">Internship Portal Management</p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                background: '#ffcccc',
                border: '1px solid var(--accent-pink)',
                padding: '8px',
                marginBottom: '15px',
                fontSize: '0.85rem',
                color: '#800000',
                textAlign: 'left',
              }}
            >
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper" style={{ width: '100%' }}>
              <input
                type="email"
                className="form-input"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper" style={{ width: '100%' }}>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In ->'}
          </button>
        </form>

        <div
          style={{
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            textAlign: 'left',
          }}
        >
          <p style={{ marginBottom: '8px', fontWeight: 'bold' }}>Demo Credentials:</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <span style={{ color: 'var(--accent-cyan)' }}>Admin:</span>
              <br />
              admin123@internflow.com
              <br />
              Pass: admin123
            </div>
            <div>
              <span style={{ color: 'var(--primary)' }}>Intern:</span>
              <br />
              hirotaro@internflow.com
              <br />
              Pass: beiti123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
