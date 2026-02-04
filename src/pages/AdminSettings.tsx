import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
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

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('issue-types');
  const [issueTypeDialogOpen, setIssueTypeDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingIssueType, setEditingIssueType] = useState(null);
  
  // State for data
  const [issueTypes, setIssueTypes] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    description: '',
    default_sla_hours: '',
    default_team_id: '',
    default_assignee_id: ''
  });

  // Fetch issue types
  const fetchIssueTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('issue_types')
        .select(`
          *,
          team:teams!issue_types_default_team_id_fkey(name),
          assignee:profiles!issue_types_default_assignee_id_fkey(full_name)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setIssueTypes(data || []);
    } catch (error) {
      console.error('Error fetching issue types:', error);
      toast({ title: "Error loading issue types", variant: "destructive" });
    }
  };

  // Fetch teams
  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({ title: "Error loading teams", variant: "destructive" });
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, team_id, team:teams!fk_team(name)')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: "Error loading users", variant: "destructive" });
    }
  };

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchIssueTypes(), fetchTeams(), fetchUsers()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleOpenDialog = (issueType = null) => {
    if (issueType) {
      setEditingIssueType(issueType);
      setFormData({
        name: issueType.name,
        icon: issueType.icon || '',
        description: issueType.description || '',
        default_sla_hours: issueType.default_sla_hours.toString(),
        default_team_id: issueType.default_team_id || '',
        default_assignee_id: issueType.default_assignee_id || ''
      });
    } else {
      setEditingIssueType(null);
      setFormData({
        name: '',
        icon: '',
        description: '',
        default_sla_hours: '',
        default_team_id: '',
        default_assignee_id: ''
      });
    }
    setIssueTypeDialogOpen(true);
  };

  // Create or update issue type
  const handleSaveIssueType = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const issueTypeData = {
        name: formData.name,
        icon: formData.icon || null,
        description: formData.description || null,
        default_sla_hours: parseInt(formData.default_sla_hours),
        default_team_id: formData.default_team_id || null,
        default_assignee_id: formData.default_assignee_id || null,
        is_active: true
      };

      if (editingIssueType) {
        // Update
        const { error } = await supabase
          .from('issue_types')
          .update({
            ...issueTypeData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingIssueType.id);

        if (error) throw error;
        toast({ title: "Issue Type Updated" });
      } else {
        // Create
        const { error } = await supabase
          .from('issue_types')
          .insert({
            ...issueTypeData,
            created_by: user.id
          });

        if (error) throw error;
        toast({ title: "Issue Type Created" });
      }

      setIssueTypeDialogOpen(false);
      setFormData({
        name: '',
        icon: '',
        description: '',
        default_sla_hours: '',
        default_team_id: '',
        default_assignee_id: ''
      });
      setEditingIssueType(null);
      fetchIssueTypes();
    } catch (error) {
      console.error('Error saving issue type:', error);
      toast({ title: "Error saving issue type", variant: "destructive" });
    }
  };

  // Delete issue type
  const handleDeleteIssueType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this issue type?')) return;

    try {
      const { error } = await supabase
        .from('issue_types')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Issue Type Deleted" });
      fetchIssueTypes();
    } catch (error) {
      console.error('Error deleting issue type:', error);
      toast({ title: "Error deleting issue type", variant: "destructive" });
    }
  };

  // Filter users by selected team
  const filteredUsers = formData.default_team_id
    ? users.filter(u => u.team_id === formData.default_team_id)
    : users;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure system settings and rules</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="issue-types">Issue Types</TabsTrigger>
          <TabsTrigger value="sla-rules">SLA Rules</TabsTrigger>
          <TabsTrigger value="routing">Routing Rules</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Issue Types Tab */}
        <TabsContent value="issue-types" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Configure issue types and their default assignments
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Issue Type
            </Button>
          </div>

          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead>Icon</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Default SLA</TableHead>
                  <TableHead>Default Assignee</TableHead>
                  <TableHead>Default Team</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : issueTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No issue types found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  issueTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="text-2xl">{type.icon}</TableCell>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>{type.default_sla_hours} hours</TableCell>
                      <TableCell>{type.assignee?.full_name || '-'}</TableCell>
                      <TableCell>{type.team?.name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8"
                            onClick={() => handleOpenDialog(type)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 text-danger hover:text-danger"
                            onClick={() => handleDeleteIssueType(type.id)}
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
        </TabsContent>

        {/* Other tabs remain the same... */}
        <TabsContent value="sla-rules" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            SLA rules configuration (coming soon)
          </p>
        </TabsContent>

        <TabsContent value="routing" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Routing rules configuration (coming soon)
          </p>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Notification preferences (coming soon)
          </p>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Issue Type Dialog */}
      <Dialog open={issueTypeDialogOpen} onOpenChange={setIssueTypeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingIssueType ? 'Edit' : 'Add'} Issue Type</DialogTitle>
            <DialogDescription>
              Configure issue type with default assignment and SLA
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input 
                placeholder="e.g., Supplier Pickups" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Icon (Emoji)</Label>
              <Input 
                placeholder="📦" 
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                maxLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                placeholder="Brief description" 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Default SLA (hours) *</Label>
              <Select 
                value={formData.default_sla_hours}
                onValueChange={(value) => setFormData({ ...formData, default_sla_hours: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="6">6 hours</SelectItem>
                  <SelectItem value="12">12 hours</SelectItem>
                  <SelectItem value="24">24 hours (1 day)</SelectItem>
                  <SelectItem value="48">48 hours (2 days)</SelectItem>
                  <SelectItem value="168">168 hours (7 days)</SelectItem>
                  <SelectItem value="336">336 hours (14 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default Team (Tier 1)</Label>
              <Select
                value={formData.default_team_id}
                onValueChange={(value) => setFormData({ ...formData, default_team_id: value, default_assignee_id: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="">No team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Team members can see and help with tickets
              </p>
            </div>

            <div className="space-y-2">
              <Label>Default Assignee (Tier 1)</Label>
              <Select
                value={formData.default_assignee_id}
                onValueChange={(value) => setFormData({ ...formData, default_assignee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="">No assignee</SelectItem>
                  {filteredUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} {user.team?.name ? `(${user.team.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Primary person responsible for this issue type
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueTypeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveIssueType}>
              <Save className="w-4 h-4 mr-2" />
              {editingIssueType ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}