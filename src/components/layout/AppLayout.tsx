import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { supabase } from '@/lib/supabase';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authChecked, setAuthChecked] = useState(false);
  const [activeView, setActiveView] = useState<string | undefined>(undefined);

  const isTicketsPage = location.pathname === '/tickets';

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate('/login', { replace: true });
      setAuthChecked(true);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/login', { replace: true });
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar onViewChange={setActiveView} />
      <main className="flex-1 overflow-hidden">
        {isTicketsPage ? (
          <div className="h-full animate-fade-in">
            <Outlet context={{ activeView, setActiveView }} />
          </div>
        ) : (
          <div className="p-6 overflow-auto h-full animate-fade-in">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
}