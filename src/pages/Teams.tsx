
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function Teams() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const { data, error } = await supabase
          .from('teams')
          .select(`
            *,
            members:profiles!fk_team(id),
            tickets:tickets!team_id(id, status)
          `)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;

        // Count active tickets for each team
        const teamsWithCounts = data.map(team => ({
          ...team,
          memberCount: team.members?.length || 0,
          activeTickets: team.tickets?.filter(t => 
            ['new', 'assigned', 'in_progress', 'pending'].includes(t.status)
          ).length || 0
        }));

        setTeams(teamsWithCounts);
      } catch (error) {
        console.error('Error fetching teams:', error);
        toast({ title: "Error loading teams", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teams</h1>
          <p className="text-muted-foreground mt-1">Loading...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-6 h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Teams</h1>
        <p className="text-muted-foreground mt-1">Manage team assignments and view performance</p>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => (
          <div
            key={team.id}
            className="bg-card rounded-lg border border-border p-6 card-hover cursor-pointer"
            onClick={() => navigate(`/teams/${team.id}`)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-3xl mb-2 block">{team.icon}</span>
                <h3 className="font-semibold text-lg text-foreground">{team.name}</h3>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">{team.description}</p>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Members
                </span>
                <span className="font-medium text-foreground">{team.memberCount}</span>
              </div>
              {/* ADD THIS */}
              {team.region?.name && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Region</span>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {team.region.name}
                  </Badge>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active Tickets</span>
                <span className="font-medium text-foreground">{team.activeTickets}</span>
              </div>
            </div>

            <Button variant="ghost" className="w-full mt-4 justify-between text-primary hover:text-primary">
              View Team
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}