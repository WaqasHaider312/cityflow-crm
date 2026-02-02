import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // User is logged in, redirect to dashboard
        navigate('/dashboard');
      }
    };

    checkAuth();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">CityFlow CRM</h1>
          <p className="text-xl text-muted-foreground">Internal ticket management system</p>
        </div>
        
        <div className="space-y-3">
          <Button size="lg" onClick={() => navigate('/login')}>
            Sign In
          </Button>
          <p className="text-sm text-muted-foreground">
            Contact your administrator for access
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
