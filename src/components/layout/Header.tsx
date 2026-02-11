import { useState, useEffect } from 'react';
import { Bell, Search, ChevronDown, Settings, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { CommandPalette } from '@/components/common/CommandPalette';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function Header() {
  const [commandOpen, setCommandOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
    fetchNotifications();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setCurrentUser(profile);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const roleColors = {
  'super_admin': 'bg-danger/15 text-danger',
  'team_admin': 'bg-info/15 text-info',
  'member': 'bg-muted text-muted-foreground',
};

const roleColor = roleColors[currentUser?.role] || 'bg-muted text-muted-foreground';

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // TODO: Fetch real notifications when you create notifications table
      setNotifications([]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
      toast({ title: "Logged out successfully" });
    } catch (error) {
      console.error('Error logging out:', error);
      toast({ title: "Error logging out", variant: "destructive" });
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const userInitials = currentUser?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <>
      <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 sticky top-0 z-40">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-foreground leading-none">CityTeam CRM</span>
            <span className="text-xs text-muted-foreground">Ticket Management</span>
          </div>
        </div>

        {/* Search Bar */}
        <button
          onClick={() => setCommandOpen(true)}
          className="flex items-center gap-3 px-4 py-2 bg-secondary rounded-lg w-96 hover:bg-secondary/80 transition-colors cursor-pointer group"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground text-sm flex-1 text-left">Search tickets, teams, users...</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-muted-foreground bg-background rounded border border-border group-hover:bg-secondary transition-colors">
            ⌘K
          </kbd>
        </button>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <NotificationDropdown notifications={notifications} unreadCount={unreadCount} />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 h-10">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                  <span className="text-primary font-semibold text-sm">{userInitials}</span>
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground">
                    {currentUser?.full_name || 'Loading...'}
                  </span>
                 <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", roleColor)}>
                    {currentUser?.role?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'User'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-danger">
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
