import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Ticket, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { GroupedIssueCard } from '@/components/dashboard/GroupedIssueCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { tickets, ticketGroups } from '@/lib/mockData';

export default function Dashboard() {
  const navigate = useNavigate();

  // Calculate stats
  const totalTickets = tickets.length;
  const overdueTickets = tickets.filter((t) => t.slaStatus === 'breached').length;
  const resolvedTickets = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;
  const slaCompliance = Math.round(((totalTickets - overdueTickets) / totalTickets) * 100);

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
          value="4.2h"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ticketGroups.slice(0, 4).map((group) => (
              <GroupedIssueCard key={group.id} group={group} />
            ))}
          </div>
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
