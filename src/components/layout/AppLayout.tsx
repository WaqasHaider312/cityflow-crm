import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isTickets = location.pathname === '/tickets';
  const [authChecked, setAuthChecked] = useState(false);

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

  // The tickets inbox owns its own full-screen 3-panel layout.
  // Secondary pages (e.g. Broadcasts) get a slim back-bar + scrollable body.
  if (isTickets) {
    return (
      <div className="h-screen bg-background overflow-hidden animate-fade-in">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="flex items-center gap-3 px-4 h-12 border-b border-border flex-shrink-0">
        <button
          onClick={() => navigate('/tickets')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Tickets
        </button>
      </header>
      <div className="flex-1 overflow-auto p-6 animate-fade-in">
        <Outlet />
      </div>
    </div>
  );
}
