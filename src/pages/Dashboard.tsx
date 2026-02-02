import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Ticket, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { GroupedIssueCard } from '@/components/dashboard/GroupedIssueCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [ticketGroups, setTicketGroups] = useState([]);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch tickets
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('tickets')
          .select(`
            *,
            issue_type:issue_types(name, icon),
            assigned_user:profiles!assigned_to(full_name),
            team:teams(name)
          `)
          .order('created_at', { ascending: false });

        if (ticketsError) throw ticketsError;

        // Fetch ticket groups
        const { data: groupsData, error: groupsError } = await supabase
          .from('ticket_groups')
          .select(`
            *,
            issue_type:issue_types(name, icon),
            assigned_user:profiles!assigned_to(full_name),
            tickets:tickets(id)
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

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

    fetchData();
  }, []);

  // Calculate stats
  const totalTickets = tickets.length;
  const overdueTickets = tickets.filter((t) => t.sla_status === 'breached').length;
  const resolvedTickets = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const slaCompliance = totalTickets > 0 
    ? Math.round(((totalTickets - overdueTickets) / totalTickets) * 100)
    : 100;

  // Calculate avg resolution time (simplified - you can enhance this)
  const avgResolutionTime = "4.2h"; // TODO: Calculate from resolved tickets

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening with your tickets.</p>
        </div>
        <Button onClick={() => navigate('/tickets/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Tickets"
          value={totalTickets}
          change="+12% from last week"
          changeType="positive"
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
          change="+5% from last week"
          changeType="positive"
          icon={CheckCircle2}
          iconColor="text-success"
        />
        <StatsCard
          title="Avg. Resolution Time"
          value={avgResolutionTime}
          change="-15min from last week"
          changeType="positive"
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
