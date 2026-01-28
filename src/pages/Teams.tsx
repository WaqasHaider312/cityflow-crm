import { useNavigate } from 'react-router-dom';
import { teams, tickets, users } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight } from 'lucide-react';

export default function Teams() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Teams</h1>
        <p className="text-muted-foreground mt-1">Manage team assignments and view performance</p>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => {
          const teamMembers = users.filter((u) => u.team === team.name || u.team.includes(team.name.split(' ')[0]));
          
          return (
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
          );
        })}
      </div>
    </div>
  );
}
