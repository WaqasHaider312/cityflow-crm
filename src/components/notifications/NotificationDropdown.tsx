import { Bell, AlertCircle, Clock, CheckCircle2, UserPlus, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '@/lib/mockData';

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
}

const notificationIcons = {
  overdue: <AlertCircle className="w-4 h-4 text-danger" />,
  warning: <Clock className="w-4 h-4 text-warning" />,
  resolved: <CheckCircle2 className="w-4 h-4 text-success" />,
  assigned: <UserPlus className="w-4 h-4 text-primary" />,
  mention: <AtSign className="w-4 h-4 text-info" />,
};

export function NotificationDropdown({ notifications, unreadCount }: NotificationDropdownProps) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger text-danger-foreground text-xs font-medium flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-popover">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {notifications.slice(0, 5).map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(
                'flex items-start gap-3 p-4 cursor-pointer',
                !notification.read && 'bg-primary/5'
              )}
              onClick={() => notification.ticketId && navigate(`/tickets/${notification.ticketId}`)}
            >
              <div className="flex-shrink-0 mt-0.5">
                {notificationIcons[notification.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {notification.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {notification.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {notification.timestamp}
                </p>
              </div>
              {!notification.read && (
                <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
              )}
            </DropdownMenuItem>
          ))}
        </div>

        <DropdownMenuSeparator />

        <div className="p-2 flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1 text-xs">
            Mark all read
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => navigate('/notifications')}
          >
            View all
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
