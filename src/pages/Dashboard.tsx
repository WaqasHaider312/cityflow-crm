import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Ticket, AlertTriangle, CheckCircle2, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { GroupedIssueCard } from '@/components/dashboard/GroupedIssueCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [ticketGroups, setTicketGroups] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [viewMode, setViewMode] = useState('my-region'); // 'my-region' or 'all'

  useEffect(() => {
    fetchData();
  }, [viewMode]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get current user with region info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, region:regions(id, name)')
        .eq('id', user.id)
        .single();

      setCurrentUser(profile);

      // Build tickets query
      let ticketsQuery = supabase
        .from('tickets')
        .select(`
          *,
          issue_type:issue_types(name, icon),
          assigned_user:profiles!assigned_to(full_name),
          team:teams!tickets_team_id_fkey(name),
          region:regions(name)
        `)
        .order('created_at', { ascending: false });

      // Filter tickets based on role
      if (!profile?.is_super_admin) {
        if (profile?.region_id && viewMode === 'my-region') {
          ticketsQuery = ticketsQuery.eq('region_id', profile.region_id);
        } else if (!profile?.region_id) {
          // Member with no region — only show tickets assigned to them
          ticketsQuery = ticketsQuery.eq('assigned_to', user.id);
        }
      }

      const { data: ticketsData, error: ticketsError } = await ticketsQuery;
      if (ticketsError) throw ticketsError;

      // Fetch ticket groups (same filtering)
      let groupsQuery = supabase
        .from('ticket_groups')
        .select(`
          *,
          issue_type:issue_types(name, icon),
          assigned_user:profiles!assigned_to(full_name),
          tickets:tickets(id)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      const { data: groupsData, error: groupsError } = await groupsQuery;
      if (groupsError) throw groupsError;

      setTickets(ticketsData || []);
      setTicketGroups(groupsData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({ title: "Error loading dashboard", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
    const totalTickets = tickets.length;
    const overdueTickets = tickets.filter((t) => t.sla_status === 'breached').length;
    const resolvedTickets = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
    const slaCompliance = totalTickets > 0 
      ? Math.round(((totalTickets - overdueTickets) / totalTickets) * 100)
      : 100;

    // Calculate average resolution time
    const calculateAvgResolutionTime = () => {
      const resolved = tickets.filter(t => t.resolved_at && t.created_at);
      if (resolved.length === 0) return '-';
      
      const totalMinutes = resolved.reduce((sum, ticket) => {
        const created = new Date(ticket.created_at);
        const resolvedDate = new Date(ticket.resolved_at);
        const diffMs = resolvedDate.getTime() - created.getTime();
        return sum + (diffMs / (1000 * 60)); // Convert to minutes
      }, 0);
      
      const avgMinutes = Math.round(totalMinutes / resolved.length);
      
      if (avgMinutes < 60) return `${avgMinutes}m`;
      const hours = Math.floor(avgMinutes / 60);
      const mins = avgMinutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const avgResolutionTime = calculateAvgResolutionTime();

  const canViewAll = currentUser?.is_super_admin || currentUser?.role === 'super_admin';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Loading...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-6 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's what's happening
            {currentUser?.region && viewMode === 'my-region' && (
              <> in <Badge variant="outline" className="ml-1 bg-primary/10 text-primary border-primary/20">{currentUser.region.name}</Badge></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle for Super Admins */}
          {canViewAll && currentUser?.region_id && (
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1">
              <Button
                variant={viewMode === 'my-region' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('my-region')}
                className="h-8"
              >
                My Region
              </Button>
              <Button
                variant={viewMode === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('all')}
                className="h-8"
              >
                <Eye className="w-4 h-4 mr-1" />
                All Regions
              </Button>
            </div>
          )}
          <Button onClick={() => navigate('/tickets/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Ticket
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Tickets"
          value={totalTickets}
          icon={Ticket}
          iconColor="text-primary"
        />
        <StatsCard
          title="Overdue"
          value={overdueTickets}
          change={overdueTickets > 0 ? "Needs attention" : "All on track"}
          changeType={overdueTickets > 0 ? "negative" : "positive"}
          icon={AlertTriangle}
          iconColor="text-danger"
        />
        <StatsCard
          title="SLA Compliance"
          value={`${slaCompliance}%`}
          icon={CheckCircle2}
          iconColor="text-success"
        />
        <StatsCard
          title="Avg. Resolution Time"
          value={avgResolutionTime}
          icon={Clock}
          iconColor="text-warning"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grouped Issues */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Grouped Issues</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/tickets/grouped')}>
              View all
            </Button>
          </div>
          {ticketGroups.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-8 text-center">
              <p className="text-muted-foreground">No grouped issues at the moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ticketGroups.slice(0, 4).map((group) => (
                <GroupedIssueCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}