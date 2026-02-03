import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Download, Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [tickets, setTickets] = useState([]);

  // Fetch tickets based on date range
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);

        // Calculate date range
        const now = new Date();
        const daysAgo = {
          '24h': 1,
          '7d': 7,
          '30d': 30,
          '90d': 90,
        }[dateRange];

        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - daysAgo);

        const { data, error } = await supabase
          .from('tickets')
          .select(`
            *,
            issue_type:issue_types(name),
            team:teams!team_id(name)
          `)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        if (error) throw error;

        setTickets(data || []);
      } catch (error) {
        console.error('Error fetching reports data:', error);
        toast({ title: "Error loading reports", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [dateRange]);

  // Calculate tickets over time
  const ticketsOverTime = () => {
    if (tickets.length === 0) return [];

    const groupedByDate = tickets.reduce((acc, ticket) => {
      const date = new Date(ticket.created_at).toLocaleDateString('en-US', { weekday: 'short' });
      if (!acc[date]) {
        acc[date] = { date, tickets: 0, resolved: 0 };
      }
      acc[date].tickets += 1;
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        acc[date].resolved += 1;
      }
      return acc;
    }, {});

    return Object.values(groupedByDate);
  };

  // Calculate SLA compliance
  const slaCompliance = () => {
    if (tickets.length === 0) return [];

    const total = tickets.length;
    const onTrack = tickets.filter(t => t.sla_status === 'on-track').length;
    const warning = tickets.filter(t => t.sla_status === 'warning').length;
    const breached = tickets.filter(t => t.sla_status === 'breached').length;

    return [
      { name: 'On Track', value: Math.round((onTrack / total) * 100), color: 'hsl(var(--success))' },
      { name: 'Warning', value: Math.round((warning / total) * 100), color: 'hsl(var(--warning))' },
      { name: 'Breached', value: Math.round((breached / total) * 100), color: 'hsl(var(--danger))' },
    ];
  };

  // Calculate resolution rate by team
  const resolutionByTeam = () => {
    if (tickets.length === 0) return [];

    const teamStats = tickets.reduce((acc, ticket) => {
      const teamName = ticket.team?.name || 'Unassigned';
      if (!acc[teamName]) {
        acc[teamName] = { total: 0, resolved: 0 };
      }
      acc[teamName].total += 1;
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        acc[teamName].resolved += 1;
      }
      return acc;
    }, {});

    return Object.entries(teamStats).map(([team, stats]: [string, any]) => ({
      team,
      rate: Math.round((stats.resolved / stats.total) * 100),
    })).sort((a, b) => b.rate - a.rate);
  };

  // Calculate top issue types
  const topIssueTypes = () => {
    if (tickets.length === 0) return [];

    const issueCount = tickets.reduce((acc, ticket) => {
      const issueType = ticket.issue_type?.name || 'Unknown';
      acc[issueType] = (acc[issueType] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(issueCount)
      .map(([type, count]) => ({ type, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">Loading...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-6 h-80 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const ticketsData = ticketsOverTime();
  const slaData = slaCompliance();
  const teamData = resolutionByTeam();
  const issueData = topIssueTypes();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Track performance and identify trends</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40 bg-card">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <p className="text-muted-foreground">No data available for the selected period</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tickets Over Time */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Tickets Over Time</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ticketsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="tickets"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    name="Created"
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    dot={false}
                    name="Resolved"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SLA Compliance */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">SLA Compliance</h3>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {slaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {slaData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {item.name}: {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution Rate by Team */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Resolution Rate by Team</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="team" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Issue Types */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Top Issue Types</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issueData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="type" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--info))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
