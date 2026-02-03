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
  
  // State for data
  const [issueTypes, setIssueTypes] = useState([]);
  const [teams, setTeams] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    default_sla_hours: '',
    default_team_id: ''
  });

  // Fetch issue types
  const fetchIssueTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('issue_types')
        .select(`
          *,
          team:teams!team_id(name)
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

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchIssueTypes(), fetchTeams()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Create issue type
  const handleCreateIssueType = async () => {
    try {
      const { error } = await supabase
        .from('issue_types')
        .insert({
          name: formData.name,
          icon: formData.icon,
          default_sla_hours: parseInt(formData.default_sla_hours),
          default_team_id: formData.default_team_id || null,
          is_active: true
        });

      if (error) throw error;

      toast({ title: "Issue Type Created" });
      setIssueTypeDialogOpen(false);
      setFormData({ name: '', icon: '', default_sla_hours: '', default_team_id: '' });
      fetchIssueTypes(); // Refresh list
    } catch (error) {
      console.error('Error creating issue type:', error);
      toast({ title: "Error creating issue type", variant: "destructive" });
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
      fetchIssueTypes(); // Refresh list
    } catch (error) {
      console.error('Error deleting issue type:', error);
      toast({ title: "Error deleting issue type", variant: "destructive" });
    }
  };

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
              Configure issue types and their default settings
            </p>
            <Button onClick={() => setIssueTypeDialogOpen(true)}>
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
                  <TableHead>Auto-assign Team</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : issueTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No issue types found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  issueTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="text-2xl">{type.icon}</TableCell>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>{type.default_sla_hours} hours</TableCell>
                      <TableCell>{type.team?.name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="w-8 h-8">
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

        {/* SLA Rules Tab */}
        <TabsContent value="sla-rules" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Define SLA durations and escalation thresholds by issue type and priority
          </p>

          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead>Issue Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>SLA Duration</TableHead>
                  <TableHead>Warning At</TableHead>
                  <TableHead>Escalate At</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Pickup Issue</TableCell>
                  <TableCell>Critical</TableCell>
                  <TableCell>2 hours</TableCell>
                  <TableCell>50%</TableCell>
                  <TableCell>75%</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Pickup Issue</TableCell>
                  <TableCell>High</TableCell>
                  <TableCell>4 hours</TableCell>
                  <TableCell>50%</TableCell>
                  <TableCell>75%</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Payment Delay</TableCell>
                  <TableCell>Critical</TableCell>
                  <TableCell>12 hours</TableCell>
                  <TableCell>50%</TableCell>
                  <TableCell>75%</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Payment Delay</TableCell>
                  <TableCell>Normal</TableCell>
                  <TableCell>24 hours</TableCell>
                  <TableCell>50%</TableCell>
                  <TableCell>75%</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Routing Rules Tab */}
        <TabsContent value="routing" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Define automatic ticket assignment rules
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </div>

          <div className="space-y-4">
            {/* Rule Card */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium text-foreground">Rule #1</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-danger hover:text-danger">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>

              <div className="bg-secondary/50 rounded-lg p-4 font-mono text-sm">
                <span className="text-info">IF</span>
                <span className="text-foreground ml-2">Issue Type</span>
                <span className="text-warning mx-2">=</span>
                <span className="text-success">"Pickup Issue"</span>
                <span className="text-info mx-2">AND</span>
                <span className="text-foreground">City</span>
                <span className="text-warning mx-2">=</span>
                <span className="text-success">"Karachi"</span>
                <br />
                <span className="text-info">THEN</span>
                <span className="text-foreground ml-2">Assign to</span>
                <span className="text-warning mx-2">=</span>
                <span className="text-success">"Ahmed Khan"</span>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium text-foreground">Rule #2</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-danger hover:text-danger">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>

              <div className="bg-secondary/50 rounded-lg p-4 font-mono text-sm">
                <span className="text-info">IF</span>
                <span className="text-foreground ml-2">Issue Type</span>
                <span className="text-warning mx-2">=</span>
                <span className="text-success">"Payment Delay"</span>
                <br />
                <span className="text-info">THEN</span>
                <span className="text-foreground ml-2">Assign to Team</span>
                <span className="text-warning mx-2">=</span>
                <span className="text-success">"Finance"</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure notification preferences and channels
          </p>

          <div className="bg-card rounded-lg border border-border p-6 space-y-4">
            <h3 className="font-medium text-foreground">Email Notifications</h3>
            
            <div className="space-y-3">
              {[
                { label: 'New ticket assigned', enabled: true },
                { label: 'Ticket approaching SLA warning', enabled: true },
                { label: 'Ticket SLA breached', enabled: true },
                { label: 'Ticket resolved', enabled: false },
                { label: 'New comment on watched ticket', enabled: true },
                { label: 'Ticket escalated', enabled: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-foreground">{item.label}</span>
                  <input
                    type="checkbox"
                    defaultChecked={item.enabled}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Issue Type Dialog */}
      <Dialog open={issueTypeDialogOpen} onOpenChange={setIssueTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Issue Type</DialogTitle>
            <DialogDescription>
              Create a new issue type with default settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                placeholder="e.g., Return Request" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <Input 
                placeholder="📦" 
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Default SLA (hours)</Label>
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
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Auto-assign Team</Label>
              <Select
                value={formData.default_team_id}
                onValueChange={(value) => setFormData({ ...formData, default_team_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueTypeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateIssueType}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
