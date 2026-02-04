import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  Layers,
  Users,
  BarChart3,
  Megaphone,
  HelpCircle,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  MapPin,
   Map,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { tickets, ticketGroups } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  collapsed?: boolean;
}

function SidebarLink({ to, icon, label, badge, collapsed }: SidebarLinkProps) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <NavLink
      to={to}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
        collapsed && 'justify-center px-2'
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  
  const openTicketsCount = tickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length;
  const activeGroupsCount = ticketGroups.filter(g => g.status === 'Active').length;

  return (
    <aside
      className={cn(
        'h-[calc(100vh-64px)] border-r border-border bg-sidebar flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Collapse Button */}
      <div className={cn('p-2 flex', collapsed ? 'justify-center' : 'justify-end')}>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto scrollbar-thin">
        <SidebarLink
          to="/dashboard"
          icon={<LayoutDashboard className="w-5 h-5" />}
          label="Dashboard"
          collapsed={collapsed}
        />
        <SidebarLink
          to="/tickets"
          icon={<Inbox className="w-5 h-5" />}
          label="My Tickets"
          badge={openTicketsCount}
          collapsed={collapsed}
        />
        <SidebarLink
          to="/tickets/grouped"
          icon={<Layers className="w-5 h-5" />}
          label="Grouped Issues"
          badge={activeGroupsCount}
          collapsed={collapsed}
        />
        <SidebarLink
          to="/teams"
          icon={<Users className="w-5 h-5" />}
          label="Teams"
          collapsed={collapsed}
        />
        <SidebarLink
          to="/reports"
          icon={<BarChart3 className="w-5 h-5" />}
          label="Reports"
          collapsed={collapsed}
        />

        {/* Divider */}
        <div className="my-4 border-t border-border" />

        <SidebarLink
          to="/communications"
          icon={<Megaphone className="w-5 h-5" />}
          label="Broadcasts"
          collapsed={collapsed}
        />
        <SidebarLink
          to="/faqs"
          icon={<HelpCircle className="w-5 h-5" />}
          label="FAQs"
          collapsed={collapsed}
        />

        {/* Admin Section */}
        <div className="my-4 border-t border-border" />

        <SidebarLink
          to="/admin/settings"
          icon={<Settings className="w-5 h-5" />}
          label="Settings"
          collapsed={collapsed}
        />
        <SidebarLink
          to="/admin/users"
          icon={<Shield className="w-5 h-5" />}
          label="User Management"
          collapsed={collapsed}
        />

        <SidebarLink
          to="/regions"
          icon={<MapPin className="w-5 h-5" />}
          label="Regions"
          collapsed={collapsed}
        />
        <SidebarLink
          to="/cities"
          icon={<Map className="w-5 h-5" />}
          label="City Mapping"
          collapsed={collapsed}
        />

      </nav>

      {/* Bottom Section */}
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            <p>CityTeam CRM v1.0</p>
            <p className="mt-1">© 2024 CityTeam</p>
          </div>
        </div>
      )}
    </aside>
  );
}
