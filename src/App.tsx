import { useState, useEffect } from 'react';
import { LoginScreen } from '@/components/LoginScreen';
import { StudentPortal } from '@/components/StudentPortal';
import { AdminPanel } from '@/components/AdminPanel';
import { updateAppFavicon } from '@/lib/favicon';

export type SessionUser =
  | { role: 'student'; studentId: string; name: string; className: string; subjects: string; imageUrl: string; gender?: string }
  | { role: 'admin'; name: string };

function App() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(() => {
    try {
      const saved = localStorage.getItem('studywise_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('studywise_session');
    if (saved && !sessionUser) {
      try {
        const parsed = JSON.parse(saved);
        setSessionUser(parsed);
        if (parsed.role === 'student') {
          updateAppFavicon(parsed.gender);
        } else {
          updateAppFavicon();
        }
      } catch {
        localStorage.removeItem('studywise_session');
        updateAppFavicon();
      }
    } else if (!sessionUser) {
      updateAppFavicon();
    }
    setLoading(false);
  }, [sessionUser]);

  const handleLogin = (user: SessionUser) => {
    localStorage.setItem('studywise_session', JSON.stringify(user));
    setSessionUser(user);
    if (user.role === 'student') {
      updateAppFavicon(user.gender);
    } else {
      updateAppFavicon();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('studywise_session');
    setSessionUser(null);
    updateAppFavicon();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8]">
        <div className="w-8 h-8 border-[3px] border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!sessionUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (sessionUser.role === 'admin') {
    return <AdminPanel user={sessionUser} onLogout={handleLogout} />;
  }

  return <StudentPortal user={sessionUser} onLogout={handleLogout} />;
}

export default App;
