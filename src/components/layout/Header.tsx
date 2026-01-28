import { useState } from 'react';
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
import { currentUser, notifications } from '@/lib/mockData';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const [commandOpen, setCommandOpen] = useState(false);
  const navigate = useNavigate();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 sticky top-0 z-40">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">CT</span>
          </div>
          <span className="font-semibold text-lg text-foreground">CityTeam</span>
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
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-medium text-sm">{currentUser.avatar}</span>
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground">{currentUser.name}</span>
                  <span className="text-xs text-muted-foreground">{currentUser.role}</span>
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
              <DropdownMenuItem onClick={() => navigate('/login')} className="text-danger">
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
