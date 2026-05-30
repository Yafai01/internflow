import { useState, useEffect } from 'react';
import { seedDatabase, type Intern } from './db';
import LoginView from './components/LoginView';
import AdminDashboard from './components/AdminDashboard';
import InternDashboard from './components/InternDashboard';
import { Shield } from 'lucide-react';

function App() {
  const [currentUser, setCurrentUser] = useState<Intern | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initApp() {
      try {
        // Seed IndexedDB if empty
        await seedDatabase();

        // Restore user session if persisted
        const savedUser = localStorage.getItem('jg_intern_user');
        if (savedUser) {
          setCurrentUser(JSON.parse(savedUser));
        }
      } catch (err) {
        console.error('App initialization failed:', err);
      } finally {
        setLoading(false);
      }
    }

    initApp();
  }, []);

  const handleLoginSuccess = (user: Intern) => {
    setCurrentUser(user);
    localStorage.setItem('jg_intern_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('jg_intern_user');
  };

  const handleUserUpdate = (updatedUser: Intern) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('jg_intern_user', JSON.stringify(updatedUser));
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--bg-dark)',
          color: '#fff',
          fontFamily: 'var(--font-heading)',
          gap: '20px',
        }}
      >
        <Shield size={64} className="text-primary" style={{ animation: 'pulse 1.5s infinite' }} />
        <div style={{ fontSize: '1.2rem', fontWeight: 600, letterSpacing: '0.05em' }}>
          LOADING DATABASE...
        </div>
        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 0.4; transform: scale(0.95); }
              50% { opacity: 1; transform: scale(1.05); }
            }
          `}
        </style>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  if (currentUser.type === 1) {
    return <AdminDashboard adminUser={currentUser} onLogout={handleLogout} />;
  }

  return (
    <InternDashboard
      internUser={currentUser}
      onLogout={handleLogout}
      onUserUpdate={handleUserUpdate}
    />
  );
}

export default App;
