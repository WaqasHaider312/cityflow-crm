import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TicketCard } from '@/components/tickets/TicketCard';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export default function TeamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [team, setTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamTickets, setTeamTickets] = useState([]);

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setLoading(true);

        // Fetch team
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', id)
          .single();

        if (teamError) throw teamError;

        // Fetch team members
        const { data: membersData, error: membersError } = await supabase
          .from('profiles')
          .select('*')
          .eq('team_id', id)
          .eq('is_active', true)
          .order('full_name');

        if (membersError) throw membersError;

        // Fetch team tickets
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('tickets')
          .select(`
            *,
            issue_type:issue_types(name, icon),
            assigned_user:profiles!assigned_to(full_name),
            team:teams!team_id(name)
          `)
          .eq('team_id', id)
          .in('status', ['new', 'assigned', 'in_progress', 'pending'])
          .order('created_at', { ascending: false });

        if (ticketsError) throw ticketsError;

        setTeam(teamData);
        setTeamMembers(membersData || []);
        setTeamTickets(ticketsData || []);
      } catch (error) {
        console.error('Error fetching team data:', error);
        toast({ title: "Error loading team", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchTeamData();
  }, [id]);

  // Calculate SLA compliance
  const calculateSLACompliance = () => {
    if (teamTickets.length === 0) return 0;
    const onTrack = teamTickets.filter(t => 
      t.sla_status === 'on-track' || t.sla_status === 'warning'
    ).length;
    return Math.round((onTrack / teamTickets.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

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

  const slaCompliance = calculateSLACompliance();

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
            <p className="text-2xl font-bold text-foreground">{teamTickets.length}</p>
            <p className="text-sm text-muted-foreground">Active Tickets</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">{slaCompliance}%</p>
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
            {teamMembers.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground text-sm">No team members yet</p>
              </div>
            ) : (
              teamMembers.map((member) => (
                <div key={member.id} className="p-4 flex items-center gap-3 hover:bg-secondary/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  {member.role !== 'member' && (
                    <Badge variant="outline" className="text-xs">
                      {member.role === 'team_admin' && <Shield className="w-3 h-3 mr-1" />}
                      {member.role === 'super_admin' ? 'Super Admin' : 
                       member.role === 'team_admin' ? 'Team Admin' : 'Member'}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Team Tickets */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-semibold text-foreground">Active Tickets ({teamTickets.length})</h2>
          <div className="space-y-3">
            {teamTickets.length === 0 ? (
              <div className="bg-card rounded-lg border border-border p-8 text-center">
                <p className="text-muted-foreground">No active tickets for this team</p>
              </div>
            ) : (
              teamTickets.slice(0, 5).map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}