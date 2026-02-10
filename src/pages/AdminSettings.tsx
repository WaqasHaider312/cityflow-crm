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
import { Switch } from '@/components/ui/switch';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('issue-types');
  const [issueTypeDialogOpen, setIssueTypeDialogOpen] = useState(false);
  const [routingRuleDialogOpen, setRoutingRuleDialogOpen] = useState(false);
  const [slaRuleDialogOpen, setSlaRuleDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingIssueType, setEditingIssueType] = useState(null);
  const [editingRoutingRule, setEditingRoutingRule] = useState(null);
  const [editingSlaRule, setEditingSlaRule] = useState(null);
  
  // State for data
  const [issueTypes, setIssueTypes] = useState([]);
  const [routingRules, setRoutingRules] = useState([]);
  const [slaRules, setSlaRules] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [regions, setRegions] = useState([]);
  
  // Form state for Issue Types
  const [issueTypeForm, setIssueTypeForm] = useState({
    name: '',
    icon: '',
    description: '',
    default_sla_hours: '',
    default_team_id: '',
    default_assignee_id: ''
  });

  // Form state for Routing Rules
  const [routingRuleForm, setRoutingRuleForm] = useState({
    name: '',
    issue_type_id: '',
    region_id: '',
    assign_to_team_id: '',
    assign_to_user_id: '',
    tier2_user_id: '',
    enable_auto_grouping: true,
    priority_order: '0'
  });

  // Form state for SLA Rules
  const [slaRuleForm, setSlaRuleForm] = useState({
    issue_type_id: '',
    priority: 'normal',
    sla_hours: '',
    escalation_threshold_percent: '80',
    tier2_team_id: ''
  });

  // Fetch all data
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

 const fetchRoutingRules = async () => {
  try {
    const { data, error } = await supabase
      .from('routing_rules')
      .select(`
        *,
        issue_type:issue_types(name),
        assign_to_team:teams!routing_rules_assign_to_team_id_fkey(name),
        assign_to_user:profiles!routing_rules_assign_to_user_id_fkey(full_name),
        tier2_user:profiles!routing_rules_tier2_user_id_fkey(full_name)
      `)
      .eq('is_active', true)
      .order('priority_order');

    if (error) throw error;
    setRoutingRules(data || []);
  } catch (error) {
    console.error('Error fetching routing rules:', error);
    toast({ title: "Error loading routing rules", variant: "destructive" });
  }
};

const fetchSlaRules = async () => {
  try {
    const { data, error } = await supabase
      .from('sla_rules')
      .select(`
        *,
        issue_type:issue_types(name),
        tier2_team:teams!sla_rules_tier2_team_id_fkey(name)
      `)
      .order('priority');

    if (error) throw error;
    setSlaRules(data || []);
  } catch (error) {
    console.error('Error fetching SLA rules:', error);
    toast({ title: "Error loading SLA rules", variant: "destructive" });
  }
};

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
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, team_id, region_id, team:teams!fk_team(name), region:regions(name)')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchRegions = async () => {
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .order('name');

      if (error) throw error;
      setRegions(data || []);
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  };

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchIssueTypes(), 
        fetchRoutingRules(),
        fetchSlaRules(),
        fetchTeams(), 
        fetchUsers(),
        fetchRegions()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  // ========== ISSUE TYPES HANDLERS ==========
  const handleOpenIssueTypeDialog = (issueType = null) => {
    if (issueType) {
      setEditingIssueType(issueType);
      setIssueTypeForm({
        name: issueType.name,
        icon: issueType.icon || '',
        description: issueType.description || '',
        default_sla_hours: issueType.default_sla_hours.toString(),
        default_team_id: issueType.default_team_id || '',
        default_assignee_id: issueType.default_assignee_id || ''
      });
    } else {
      setEditingIssueType(null);
      setIssueTypeForm({
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

  const handleSaveIssueType = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const issueTypeData = {
        name: issueTypeForm.name,
        icon: issueTypeForm.icon || null,
        description: issueTypeForm.description || null,
        default_sla_hours: parseInt(issueTypeForm.default_sla_hours),
        default_team_id: issueTypeForm.default_team_id === 'none' ? null : (issueTypeForm.default_team_id || null),
        default_assignee_id: issueTypeForm.default_assignee_id === 'none' ? null : (issueTypeForm.default_assignee_id || null),
        is_active: true
      };

      if (editingIssueType) {
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
      setEditingIssueType(null);
      fetchIssueTypes();
    } catch (error) {
      console.error('Error saving issue type:', error);
      toast({ title: "Error saving issue type", variant: "destructive" });
    }
  };

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

  // ========== ROUTING RULES HANDLERS ==========
  const handleOpenRoutingRuleDialog = (rule = null) => {
    if (rule) {
      setEditingRoutingRule(rule);
      setRoutingRuleForm({
        name: rule.name,
        issue_type_id: rule.issue_type_id || '',
        region_id: rule.region_id || '',
        assign_to_team_id: rule.assign_to_team_id || '',
        assign_to_user_id: rule.assign_to_user_id || '',
        tier2_user_id: rule.tier2_user_id || '',
        enable_auto_grouping: rule.enable_auto_grouping,
        priority_order: rule.priority_order.toString()
      });
    } else {
      setEditingRoutingRule(null);
      setRoutingRuleForm({
        name: '',
        issue_type_id: '',
        region_id: '',
        assign_to_team_id: '',
        assign_to_user_id: '',
        tier2_user_id: '',
        enable_auto_grouping: true,
        priority_order: '0'
      });
    }
    setRoutingRuleDialogOpen(true);
  };

  const handleSaveRoutingRule = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      
  const ruleData = {
        name: routingRuleForm.name,
        issue_type_id: routingRuleForm.issue_type_id === 'none' ? null : (routingRuleForm.issue_type_id || null),
        region_id: routingRuleForm.region_id === 'none' ? null : (routingRuleForm.region_id || null),
        assign_to_team_id: routingRuleForm.assign_to_team_id === 'none' ? null : (routingRuleForm.assign_to_team_id || null),
        assign_to_user_id: routingRuleForm.assign_to_user_id === 'none' ? null : (routingRuleForm.assign_to_user_id || null),
        tier2_user_id: routingRuleForm.tier2_user_id === 'none' ? null : (routingRuleForm.tier2_user_id || null),
        enable_auto_grouping: routingRuleForm.enable_auto_grouping,
        priority_order: parseInt(routingRuleForm.priority_order),
        is_active: true
      };
      if (editingRoutingRule) {
        const { error } = await supabase
          .from('routing_rules')
          .update({
            ...ruleData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingRoutingRule.id);

        if (error) throw error;
        toast({ title: "Routing Rule Updated" });
      } else {
        const { error } = await supabase
          .from('routing_rules')
          .insert({
            ...ruleData,
            created_by: user.id
          });

        if (error) throw error;
        toast({ title: "Routing Rule Created" });
      }

      setRoutingRuleDialogOpen(false);
      setEditingRoutingRule(null);
      fetchRoutingRules();
    } catch (error) {
      console.error('Error saving routing rule:', error);
      toast({ title: "Error saving routing rule", variant: "destructive" });
    }
  };

  const handleDeleteRoutingRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this routing rule?')) return;

    try {
      const { error } = await supabase
        .from('routing_rules')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Routing Rule Deleted" });
      fetchRoutingRules();
    } catch (error) {
      console.error('Error deleting routing rule:', error);
      toast({ title: "Error deleting routing rule", variant: "destructive" });
    }
  };

  // ========== SLA RULES HANDLERS ==========
  const handleOpenSlaRuleDialog = (rule = null) => {
    if (rule) {
      setEditingSlaRule(rule);
      setSlaRuleForm({
        issue_type_id: rule.issue_type_id || '',
        priority: rule.priority,
        sla_hours: rule.sla_hours.toString(),
        escalation_threshold_percent: rule.escalation_threshold_percent.toString(),
        tier2_team_id: rule.tier2_team_id || ''
      });
    } else {
      setEditingSlaRule(null);
      setSlaRuleForm({
        issue_type_id: '',
        priority: 'normal',
        sla_hours: '',
        escalation_threshold_percent: '80',
        tier2_team_id: ''
      });
    }
    setSlaRuleDialogOpen(true);
  };

  const handleSaveSlaRule = async () => {
    try {
      const ruleData = {
        issue_type_id: slaRuleForm.issue_type_id === 'none' ? null : slaRuleForm.issue_type_id,
        priority: slaRuleForm.priority,
        sla_hours: parseInt(slaRuleForm.sla_hours),
        escalation_threshold_percent: parseInt(slaRuleForm.escalation_threshold_percent),
        tier2_team_id: slaRuleForm.tier2_team_id === 'none' ? null : slaRuleForm.tier2_team_id
      };

      if (editingSlaRule) {
        const { error } = await supabase
          .from('sla_rules')
          .update({
            ...ruleData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSlaRule.id);

        if (error) throw error;
        toast({ title: "SLA Rule Updated" });
      } else {
        const { error } = await supabase
          .from('sla_rules')
          .insert(ruleData);

        if (error) throw error;
        toast({ title: "SLA Rule Created" });
      }

      setSlaRuleDialogOpen(false);
      setEditingSlaRule(null);
      fetchSlaRules();
    } catch (error) {
      console.error('Error saving SLA rule:', error);
      toast({ title: "Error saving SLA rule", variant: "destructive" });
    }
  };

  const handleDeleteSlaRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SLA rule?')) return;

    try {
      const { error } = await supabase
        .from('sla_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "SLA Rule Deleted" });
      fetchSlaRules();
    } catch (error) {
      console.error('Error deleting SLA rule:', error);
      toast({ title: "Error deleting SLA rule", variant: "destructive" });
    }
  };

  // Filter users by selected team
  const filteredUsersByTeam = issueTypeForm.default_team_id
  ? users.filter(u => u.team_id === issueTypeForm.default_team_id)
  : users;

  const filteredTier2Users = routingRuleForm.region_id
    ? users.filter(u => u.region_id === routingRuleForm.region_id)
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
          <TabsTrigger value="routing">Routing Rules</TabsTrigger>
          <TabsTrigger value="sla-rules">SLA Rules</TabsTrigger>
        </TabsList>

        {/* ========== ISSUE TYPES TAB ========== */}
        <TabsContent value="issue-types" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Configure issue types and their default assignments
            </p>
            <Button onClick={() => handleOpenIssueTypeDialog()}>
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
                            onClick={() => handleOpenIssueTypeDialog(type)}
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

        {/* ========== ROUTING RULES TAB ========== */}
        <TabsContent value="routing" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Configure ticket routing and auto-grouping rules
            </p>
            <Button onClick={() => handleOpenRoutingRuleDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Routing Rule
            </Button>
          </div>

          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead>Priority</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Issue Type</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Tier 1 (Assignee)</TableHead>
                  <TableHead>Tier 2 (Watcher)</TableHead>
                  <TableHead>Auto-Group</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : routingRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No routing rules found. Create one to enable auto-assignment.
                    </TableCell>
                  </TableRow>
                ) : (
                  routingRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>{rule.priority_order}</TableCell>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>{rule.issue_type?.name || 'All'}</TableCell>
                      <TableCell>{rule.region?.name || 'All'}</TableCell>
                      <TableCell>
                        {rule.assign_to_user?.full_name || rule.assign_to_team?.name || '-'}
                      </TableCell>
                      <TableCell>{rule.tier2_user?.full_name || '-'}</TableCell>
                      <TableCell>
                        {rule.enable_auto_grouping ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8"
                            onClick={() => handleOpenRoutingRuleDialog(rule)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 text-danger hover:text-danger"
                            onClick={() => handleDeleteRoutingRule(rule.id)}
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

        {/* ========== SLA RULES TAB ========== */}
        <TabsContent value="sla-rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Override SLA settings based on priority and issue type
            </p>
            <Button onClick={() => handleOpenSlaRuleDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add SLA Rule
            </Button>
          </div>

          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead>Issue Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>SLA Hours</TableHead>
                  <TableHead>Escalation Threshold</TableHead>
                  <TableHead>Tier 2 Team</TableHead>
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
                ) : slaRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No SLA rules found. Create one to override default SLAs.
                    </TableCell>
                  </TableRow>
                ) : (
                  slaRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>{rule.issue_type?.name || 'All'}</TableCell>
                      <TableCell>
                        <span className={`capitalize px-2 py-1 rounded text-xs ${
                          rule.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          rule.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          rule.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.priority}
                        </span>
                      </TableCell>
                      <TableCell>{rule.sla_hours} hours</TableCell>
                      <TableCell>{rule.escalation_threshold_percent}%</TableCell>
                      <TableCell>{rule.tier2_team?.name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8"
                            onClick={() => handleOpenSlaRuleDialog(rule)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 text-danger hover:text-danger"
                            onClick={() => handleDeleteSlaRule(rule.id)}
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
      </Tabs>

      {/* ========== ISSUE TYPE DIALOG ========== */}
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
                placeholder="e.g., Pickup Request" 
                value={issueTypeForm.name}
                onChange={(e) => setIssueTypeForm({ ...issueTypeForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Icon (Emoji)</Label>
              <Input 
                placeholder="📦" 
                value={issueTypeForm.icon}
                onChange={(e) => setIssueTypeForm({ ...issueTypeForm, icon: e.target.value })}
                maxLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                placeholder="Brief description" 
                value={issueTypeForm.description}
                onChange={(e) => setIssueTypeForm({ ...issueTypeForm, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Default SLA (hours) *</Label>
              <Select 
                value={issueTypeForm.default_sla_hours}
                onValueChange={(value) => setIssueTypeForm({ ...issueTypeForm, default_sla_hours: value })}
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
                value={issueTypeForm.default_team_id}
                onValueChange={(value) => setIssueTypeForm({ ...issueTypeForm, default_team_id: value, default_assignee_id: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default Assignee (Tier 1)</Label>
              <Select
                value={issueTypeForm.default_assignee_id}
                onValueChange={(value) => setIssueTypeForm({ ...issueTypeForm, default_assignee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">No assignee</SelectItem>
                  {filteredUsersByTeam.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} {user.team?.name ? `(${user.team.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* ========== ROUTING RULE DIALOG ========== */}
      <Dialog open={routingRuleDialogOpen} onOpenChange={setRoutingRuleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRoutingRule ? 'Edit' : 'Add'} Routing Rule</DialogTitle>
            <DialogDescription>
              Configure ticket routing with Tier 1 assignee and Tier 2 watcher
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input 
                placeholder="e.g., Lahore Pickups" 
                value={routingRuleForm.name}
                onChange={(e) => setRoutingRuleForm({ ...routingRuleForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Issue Type</Label>
              <Select
                value={routingRuleForm.issue_type_id}
                onValueChange={(value) => setRoutingRuleForm({ ...routingRuleForm, issue_type_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All issue types" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="">All issue types</SelectItem>
                  {issueTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>{type.icon} {type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Region</Label>
              <Select
                value={routingRuleForm.region_id}
                onValueChange={(value) => setRoutingRuleForm({ ...routingRuleForm, region_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All regions" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="">All regions</SelectItem>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tier 1 Team</Label>
              <Select
                value={routingRuleForm.assign_to_team_id}
                onValueChange={(value) => setRoutingRuleForm({ ...routingRuleForm, assign_to_team_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tier 1 Assignee (Individual)</Label>
              <Select
                value={routingRuleForm.assign_to_user_id}
                onValueChange={(value) => setRoutingRuleForm({ ...routingRuleForm, assign_to_user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">No individual assignee</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} {user.region?.name ? `(${user.region.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tier 2 Watcher (City Team)</Label>
              <Select
                value={routingRuleForm.tier2_user_id}
                onValueChange={(value) => setRoutingRuleForm({ ...routingRuleForm, tier2_user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select watcher" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">No watcher</SelectItem>
                  {filteredTier2Users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} {user.region?.name ? `(${user.region.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority Order</Label>
              <Input 
                type="number"
                placeholder="0" 
                value={routingRuleForm.priority_order}
                onChange={(e) => setRoutingRuleForm({ ...routingRuleForm, priority_order: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers = higher priority. Rules are evaluated in order.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded">
              <div>
                <Label>Enable Auto-Grouping</Label>
                <p className="text-xs text-muted-foreground">
                  Group tickets by issue type + region
                </p>
              </div>
              <Switch
                checked={routingRuleForm.enable_auto_grouping}
                onCheckedChange={(checked) => setRoutingRuleForm({ ...routingRuleForm, enable_auto_grouping: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoutingRuleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRoutingRule}>
              <Save className="w-4 h-4 mr-2" />
              {editingRoutingRule ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== SLA RULE DIALOG ========== */}
      <Dialog open={slaRuleDialogOpen} onOpenChange={setSlaRuleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSlaRule ? 'Edit' : 'Add'} SLA Rule</DialogTitle>
            <DialogDescription>
              Override default SLA based on priority and issue type
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Issue Type</Label>
              <Select
                value={slaRuleForm.issue_type_id}
                onValueChange={(value) => setSlaRuleForm({ ...slaRuleForm, issue_type_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All issue types" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="">All issue types</SelectItem>
                  {issueTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>{type.icon} {type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority *</Label>
              <Select
                value={slaRuleForm.priority}
                onValueChange={(value) => setSlaRuleForm({ ...slaRuleForm, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>SLA Hours *</Label>
              <Select 
                value={slaRuleForm.sla_hours}
                onValueChange={(value) => setSlaRuleForm({ ...slaRuleForm, sla_hours: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="6">6 hours</SelectItem>
                  <SelectItem value="12">12 hours</SelectItem>
                  <SelectItem value="24">24 hours (1 day)</SelectItem>
                  <SelectItem value="48">48 hours (2 days)</SelectItem>
                  <SelectItem value="72">72 hours (3 days)</SelectItem>
                  <SelectItem value="168">168 hours (7 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Escalation Threshold (%)</Label>
              <Input 
                type="number"
                placeholder="80" 
                min="0"
                max="100"
                value={slaRuleForm.escalation_threshold_percent}
                onChange={(e) => setSlaRuleForm({ ...slaRuleForm, escalation_threshold_percent: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Auto-escalate when SLA is {slaRuleForm.escalation_threshold_percent}% consumed
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tier 2 Team (Escalation)</Label>
              <Select
                value={slaRuleForm.tier2_team_id}
                onValueChange={(value) => setSlaRuleForm({ ...slaRuleForm, tier2_team_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSlaRuleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSlaRule}>
              <Save className="w-4 h-4 mr-2" />
              {editingSlaRule ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}