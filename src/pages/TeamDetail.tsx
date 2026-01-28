import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Mail, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { teams, users, tickets } from '@/lib/mockData';
import { Badge } from '@/components/ui/badge';
import { TicketCard } from '@/components/tickets/TicketCard';

export default function TeamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const team = teams.find((t) => t.id === parseInt(id || '0'));
  const teamMembers = users.filter((u) => u.team === team?.name || u.team.includes(team?.name.split(' ')[0] || ''));
  const teamTickets = tickets.filter((t) => {
    const assignee = users.find((u) => u.name === t.assignedTo);
    return assignee && (assignee.team === team?.name || assignee.team.includes(team?.name.split(' ')[0] || ''));
  });

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Team not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/teams')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Teams
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/teams')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Teams
      </Button>

      {/* Team Header */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{team.icon}</span>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
              <p className="text-muted-foreground mt-1">{team.description}</p>
            </div>
          </div>
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{teamMembers.length}</p>
            <p className="text-sm text-muted-foreground">Members</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{team.activeTickets}</p>
            <p className="text-sm text-muted-foreground">Active Tickets</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">94%</p>
            <p className="text-sm text-muted-foreground">SLA Compliance</p>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Members */}
        <div className="bg-card rounded-lg border border-border">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Team Members</h2>
          </div>
          <div className="divide-y divide-border">
            {teamMembers.map((member) => (
              <div key={member.id} className="p-4 flex items-center gap-3 hover:bg-secondary/30 transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">{member.avatar}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                {member.role !== 'Team Member' && (
                  <Badge variant="outline" className="text-xs">
                    {member.role === 'Team Admin' ? <Shield className="w-3 h-3 mr-1" /> : null}
                    {member.role}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Team Tickets */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-semibold text-foreground">Active Tickets ({teamTickets.length})</h2>
          <div className="space-y-3">
            {teamTickets.slice(0, 5).map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
            {teamTickets.length === 0 && (
              <div className="bg-card rounded-lg border border-border p-8 text-center">
                <p className="text-muted-foreground">No active tickets for this team</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
