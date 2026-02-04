import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Users, ArrowRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export default function Teams() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [regions, setRegions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  
  // Form state
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [teamType, setTeamType] = useState('functional');
  const [regionId, setRegionId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setCurrentUser(profile);
      }

      // Fetch teams
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          region:regions(id, name),
          members:profiles!fk_team(id),
          tickets:tickets!team_id(id, status)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Fetch regions for form
      const { data: regionsData } = await supabase
        .from('regions')
        .select('*')
        .order('name');

      const teamsWithCounts = data.map(team => ({
        ...team,
        memberCount: team.members?.length || 0,
        activeTickets: team.tickets?.filter(t => 
          ['new', 'assigned', 'in_progress', 'pending'].includes(t.status)
        ).length || 0
      }));

      setTeams(teamsWithCounts);
      setRegions(regionsData || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({ title: "Error loading teams", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (team = null) => {
    if (team) {
      setEditingTeam(team);
      setTeamName(team.name);
      setDescription(team.description || '');
      setIcon(team.icon || '');
      setTeamType(team.team_type || 'functional');
      setRegionId(team.region_id || '');
    } else {
      setEditingTeam(null);
      setTeamName('');
      setDescription('');
      setIcon('');
      setTeamType('functional');
      setRegionId('');
    }
    setDialogOpen(true);
  };

  const handleSaveTeam = async () => {
    if (!teamName.trim()) {
      toast({ title: "Team name is required", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const teamData = {
        name: teamName,
        description: description || null,
        icon: icon || null,
        team_type: teamType,
        region_id: teamType === 'city_team' ? regionId : null,
        updated_at: new Date().toISOString()
      };

      if (editingTeam) {
        const { error } = await supabase
          .from('teams')
          .update(teamData)
          .eq('id', editingTeam.id);

        if (error) throw error;
        toast({ title: "Team Updated" });
      } else {
        const { error } = await supabase
          .from('teams')
          .insert({
            ...teamData,
            created_by: user.id,
            is_active: true
          });

        if (error) throw error;
        toast({ title: "Team Created" });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving team:', error);
      toast({ title: "Error saving team", variant: "destructive" });
    }
  };

  const handleDeleteTeam = async (id: string, name: string) => {
    if (!confirm(`Delete team "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from('teams')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Team Deleted" });
      fetchData();
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({ title: "Error deleting team", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setTeamName('');
    setDescription('');
    setIcon('');
    setTeamType('functional');
    setRegionId('');
    setEditingTeam(null);
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.is_super_admin;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teams</h1>
          <p className="text-muted-foreground mt-1">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teams</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? 'Manage teams and assignments' : 'View team assignments and performance'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Create Team
          </Button>
        )}
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => (
          <div
            key={team.id}
            className="bg-card rounded-lg border border-border p-6 card-hover cursor-pointer group relative"
            onClick={() => navigate(`/teams/${team.id}`)}
          >
            {/* Admin controls */}
            {isAdmin && (
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDialog(team);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 text-danger hover:text-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTeam(team.id, team.name);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}

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

      {/* Create/Edit Team Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit Team' : 'Create Team'}</DialogTitle>
            <DialogDescription>
              {editingTeam ? 'Update team details' : 'Create a new team for ticket management'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Team Name *</Label>
              <Input 
                placeholder="e.g., Logistics Team" 
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Icon (Emoji)</Label>
              <Input 
                placeholder="📦 🚚 💰" 
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Team Type *</Label>
              <Select value={teamType} onValueChange={setTeamType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="functional">Functional Team</SelectItem>
                  <SelectItem value="city_team">City Team</SelectItem>
                  <SelectItem value="custom">Custom Team</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {teamType === 'city_team' && (
              <div className="space-y-2">
                <Label>Region *</Label>
                <Select value={regionId} onValueChange={setRegionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {regions.map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                placeholder="Brief description..." 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTeam}>
              {editingTeam ? 'Update' : 'Create'} Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}