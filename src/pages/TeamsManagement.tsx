import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Users as UsersIcon } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

export default function TeamsManagement() {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [regions, setRegions] = useState([]);
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

      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          region:regions(name),
          members:profiles!fk_team(id)
        `)
        .order('name');

      if (teamsError) throw teamsError;

      // Fetch regions
      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('*')
        .order('name');

      if (regionsError) throw regionsError;

      setTeams(teamsData || []);
      setRegions(regionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
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
        // Update existing team
        const { error } = await supabase
          .from('teams')
          .update(teamData)
          .eq('id', editingTeam.id);

        if (error) throw error;
        toast({ title: "Team Updated" });
      } else {
        // Create new team
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
    if (!confirm(`Delete team "${name}"? Members will be unassigned.`)) return;

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

  const teamTypeDisplay = {
    functional: 'Functional Team',
    city_team: 'City Team',
    custom: 'Custom Team'
  };

  const teamTypeColors = {
    functional: 'bg-primary/10 text-primary border-primary/20',
    city_team: 'bg-info/10 text-info border-info/20',
    custom: 'bg-warning/10 text-warning border-warning/20'
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teams Management</h1>
          <p className="text-muted-foreground mt-1">Loading...</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <p className="text-muted-foreground">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teams Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage teams for ticket assignment
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Create Team
        </Button>
      </div>

      {/* Teams Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead>Team</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No teams found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {team.icon && <span className="text-2xl">{team.icon}</span>}
                      <span className="font-medium text-foreground">{team.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={teamTypeColors[team.team_type] || teamTypeColors.custom}
                    >
                      {teamTypeDisplay[team.team_type] || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {team.region?.name || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UsersIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{team.members?.length || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {team.description || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8"
                        onClick={() => handleOpenDialog(team)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8 text-danger hover:text-danger"
                        onClick={() => handleDeleteTeam(team.id, team.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Team Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit Team' : 'Create Team'}</DialogTitle>
            <DialogDescription>
              {editingTeam 
                ? 'Update team details and settings' 
                : 'Create a new team for ticket management'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Team Name *</Label>
              <Input 
                placeholder="e.g., Logistics Team, Finance Team" 
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
              <p className="text-xs text-muted-foreground">
                Functional: Logistics, Finance, etc. | City Team: Regional teams
              </p>
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
                placeholder="Brief description of team responsibilities..." 
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