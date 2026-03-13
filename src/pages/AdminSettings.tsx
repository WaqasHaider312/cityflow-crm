import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

// ─── Types ────────────────────────────────────────────────────────────────────

type WarningContext = 'issue-type' | 'routing' | 'sla' | null;

// ─── SLA Auto-Generation Helper ───────────────────────────────────────────────

const generateSlaHours = (defaultHours: number) => ({
  critical: Math.max(1, Math.round(defaultHours / 3)),
  high:     Math.max(2, Math.round(defaultHours / 2)),
  normal:   defaultHours,
  low:      defaultHours * 2,
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('issue-types');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // ── Dialog open states ───────────────────────────────────────────────────────
  const [issueTypeDialogOpen, setIssueTypeDialogOpen] = useState(false);
  const [routingRuleDialogOpen, setRoutingRuleDialogOpen] = useState(false);
  const [slaRuleDialogOpen, setSlaRuleDialogOpen] = useState(false);
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [slaPreviewDialogOpen, setSlaPreviewDialogOpen] = useState(false);

  // ── Editing state ────────────────────────────────────────────────────────────
  const [editingIssueType, setEditingIssueType] = useState<any>(null);
  const [editingRoutingRule, setEditingRoutingRule] = useState<any>(null);
  const [editingSlaRule, setEditingSlaRule] = useState<any>(null);

  // ── Warning state ────────────────────────────────────────────────────────────
  const [warningContext, setWarningContext] = useState<WarningContext>(null);
  const [warningChecks, setWarningChecks] = useState({ issueType: false, routing: false, sla: false });
  const [affectedRoutingRules, setAffectedRoutingRules] = useState<any[]>([]);
  const [affectedSlaRules, setAffectedSlaRules] = useState<any[]>([]);
  const [slaPreview, setSlaPreview] = useState<any>(null);

  // ── Data ─────────────────────────────────────────────────────────────────────
  const [issueTypes, setIssueTypes] = useState<any[]>([]);
  const [routingRules, setRoutingRules] = useState<any[]>([]);
  const [slaRules, setSlaRules] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);

  // ── Forms ─────────────────────────────────────────────────────────────────────
  const [issueTypeForm, setIssueTypeForm] = useState({
    name: '', icon: '', description: '',
    default_sla_hours: '', default_team_id: '', default_assignee_id: ''
  });

  const [routingRuleForm, setRoutingRuleForm] = useState({
    name: '', issue_type_id: '', region_id: '',
    assign_to_team_id: '', assign_to_user_id: '', tier2_user_id: '',
    enable_auto_grouping: true, priority_order: '0'
  });

  const [slaRuleForm, setSlaRuleForm] = useState({
    issue_type_id: '', priority: 'normal', sla_hours: '',
    escalation_threshold_percent: '80', tier2_team_id: ''
  });

  // ─── Data Fetchers ────────────────────────────────────────────────────────────

  const fetchIssueTypes = async () => {
    const { data } = await supabase
      .from('issue_types')
      .select(`*, team:teams!issue_types_default_team_id_fkey(name), assignee:profiles!issue_types_default_assignee_id_fkey(full_name)`)
      .eq('is_active', true).order('name');
    setIssueTypes(data || []);
  };

  const fetchRoutingRules = async () => {
    const { data } = await supabase
      .from('routing_rules')
      .select(`*, issue_type:issue_types!routing_rules_issue_type_id_fkey(name), region:regions!routing_rules_region_id_fkey(name), assign_to_team:teams!routing_rules_assign_to_team_id_fkey(name), assign_to_user:profiles!routing_rules_assign_to_user_id_fkey(full_name), tier2_user:profiles!routing_rules_tier2_user_id_fkey(full_name)`)
      .eq('is_active', true).order('priority_order');
    setRoutingRules(data || []);
  };

  const fetchSlaRules = async () => {
    const { data } = await supabase
      .from('sla_rules')
      .select(`*, issue_type:issue_types!sla_rules_issue_type_id_fkey(name), tier2_team:teams!sla_rules_tier2_team_id_fkey(name)`)
      .order('priority');
    setSlaRules(data || []);
  };

  const fetchTeams = async () => {
    const { data } = await supabase.from('teams').select('*').eq('is_active', true).order('name');
    setTeams(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, team_id, region_id, team:teams!fk_team(name), region:regions!region_id(name)')
      .eq('is_active', true).order('full_name');
    setUsers(data || []);
  };

  const fetchRegions = async () => {
    const { data } = await supabase.from('regions').select('*').order('name');
    setRegions(data || []);
  };

  // ─── Init ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setAccessDenied(true); setLoading(false); return; }
        const { data: profile } = await supabase.from('profiles').select('role, is_super_admin').eq('id', user.id).single();
        if (!profile?.is_super_admin && profile?.role !== 'admin') {
          setAccessDenied(true); setLoading(false); return;
        }
        await Promise.all([fetchIssueTypes(), fetchRoutingRules(), fetchSlaRules(), fetchTeams(), fetchUsers(), fetchRegions()]);
      } catch (error) {
        console.error('Error loading admin settings:', error);
        toast({ title: 'Error loading settings', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // ─── Warning Helper ───────────────────────────────────────────────────────────

  const showCrossUpdateWarning = (context: WarningContext, issueTypeId?: string) => {
    setWarningContext(context);
    setWarningChecks({ issueType: false, routing: false, sla: false });
    if (issueTypeId) {
      setAffectedRoutingRules(routingRules.filter(r => r.issue_type_id === issueTypeId));
      setAffectedSlaRules(slaRules.filter(r => r.issue_type_id === issueTypeId));
    } else {
      setAffectedRoutingRules([]);
      setAffectedSlaRules([]);
    }
    setWarningDialogOpen(true);
  };

  // ─── Auto-generate SLA rules for an issue type ────────────────────────────────

  const autoGenerateSlaRules = async (issueTypeId: string, defaultHours: number) => {
    const hours = generateSlaHours(defaultHours);
    const priorities = ['critical', 'high', 'normal', 'low'] as const;

    for (const priority of priorities) {
      const existing = slaRules.find(r => r.issue_type_id === issueTypeId && r.priority === priority);
      const thresholds: Record<string, number> = { critical: 70, high: 75, normal: 80, low: 80 };

      if (existing) {
        await supabase.from('sla_rules').update({
          sla_hours: hours[priority],
          escalation_threshold_percent: thresholds[priority],
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
      } else {
        await supabase.from('sla_rules').insert({
          issue_type_id: issueTypeId,
          priority,
          sla_hours: hours[priority],
          escalation_threshold_percent: thresholds[priority],
          tier2_team_id: null,
        });
      }
    }
    await fetchSlaRules();
  };

  // ─── Issue Type Handlers ──────────────────────────────────────────────────────

  const handleOpenIssueTypeDialog = (issueType: any = null) => {
    if (issueType) {
      setEditingIssueType(issueType);
      setIssueTypeForm({
        name: issueType.name,
        icon: issueType.icon || '',
        description: issueType.description || '',
        default_sla_hours: issueType.default_sla_hours.toString(),
        default_team_id: issueType.default_team_id || '',
        default_assignee_id: issueType.default_assignee_id || '',
      });
      // Show SLA preview
      const hours = generateSlaHours(issueType.default_sla_hours);
      setSlaPreview(hours);
    } else {
      setEditingIssueType(null);
      setIssueTypeForm({ name: '', icon: '', description: '', default_sla_hours: '', default_team_id: '', default_assignee_id: '' });
      setSlaPreview(null);
    }
    setIssueTypeDialogOpen(true);
  };

  const handleSlaHoursChange = (value: string) => {
    setIssueTypeForm(p => ({ ...p, default_sla_hours: value }));
    const num = parseInt(value);
    if (!isNaN(num) && num > 0) setSlaPreview(generateSlaHours(num));
    else setSlaPreview(null);
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
        is_active: true,
      };

      let savedId = editingIssueType?.id;

      if (editingIssueType) {
        const { error } = await supabase.from('issue_types').update({ ...issueTypeData, updated_at: new Date().toISOString() }).eq('id', editingIssueType.id);
        if (error) throw error;
        toast({ title: 'Issue Type Updated' });
      } else {
        const { data, error } = await supabase.from('issue_types').insert({ ...issueTypeData, created_by: user.id }).select().single();
        if (error) throw error;
        savedId = data.id;
        toast({ title: 'Issue Type Created' });
      }

      // Auto-generate SLA rules
      if (savedId && issueTypeData.default_sla_hours) {
        await autoGenerateSlaRules(savedId, issueTypeData.default_sla_hours);
        toast({ title: 'SLA rules auto-generated for all priorities' });
      }

      setIssueTypeDialogOpen(false);
      setEditingIssueType(null);
      await fetchIssueTypes();
      showCrossUpdateWarning('issue-type', savedId);
    } catch (error) {
      console.error('Error saving issue type:', error);
      toast({ title: 'Error saving issue type', variant: 'destructive' });
    }
  };

  const handleDeleteIssueType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this issue type?')) return;
    try {
      const { error } = await supabase.from('issue_types').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      toast({ title: 'Issue Type Deleted' });
      fetchIssueTypes();
    } catch (error) {
      toast({ title: 'Error deleting issue type', variant: 'destructive' });
    }
  };

  // ─── Routing Rule Handlers ────────────────────────────────────────────────────

  const handleOpenRoutingRuleDialog = (rule: any = null) => {
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
        priority_order: rule.priority_order.toString(),
      });
    } else {
      setEditingRoutingRule(null);
      setRoutingRuleForm({ name: '', issue_type_id: '', region_id: '', assign_to_team_id: '', assign_to_user_id: '', tier2_user_id: '', enable_auto_grouping: true, priority_order: '0' });
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
        is_active: true,
      };

      if (editingRoutingRule) {
        const { error } = await supabase.from('routing_rules').update({ ...ruleData, updated_at: new Date().toISOString() }).eq('id', editingRoutingRule.id);
        if (error) throw error;
        toast({ title: 'Routing Rule Updated' });
      } else {
        const { error } = await supabase.from('routing_rules').insert({ ...ruleData, created_by: user.id });
        if (error) throw error;
        toast({ title: 'Routing Rule Created' });
      }

      setRoutingRuleDialogOpen(false);
      setEditingRoutingRule(null);
      await fetchRoutingRules();
      showCrossUpdateWarning('routing');
    } catch (error) {
      console.error('Error saving routing rule:', error);
      toast({ title: 'Error saving routing rule', variant: 'destructive' });
    }
  };

  const handleDeleteRoutingRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this routing rule?')) return;
    try {
      const { error } = await supabase.from('routing_rules').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      toast({ title: 'Routing Rule Deleted' });
      fetchRoutingRules();
    } catch (error) {
      toast({ title: 'Error deleting routing rule', variant: 'destructive' });
    }
  };

  // ─── SLA Rule Handlers ────────────────────────────────────────────────────────

  const handleOpenSlaRuleDialog = (rule: any = null) => {
    if (rule) {
      setEditingSlaRule(rule);
      setSlaRuleForm({
        issue_type_id: rule.issue_type_id || '',
        priority: rule.priority,
        sla_hours: rule.sla_hours.toString(),
        escalation_threshold_percent: rule.escalation_threshold_percent.toString(),
        tier2_team_id: rule.tier2_team_id || '',
      });
    } else {
      setEditingSlaRule(null);
      setSlaRuleForm({ issue_type_id: '', priority: 'normal', sla_hours: '', escalation_threshold_percent: '80', tier2_team_id: '' });
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
        tier2_team_id: slaRuleForm.tier2_team_id === 'none' ? null : slaRuleForm.tier2_team_id,
      };

      if (editingSlaRule) {
        const { error } = await supabase.from('sla_rules').update({ ...ruleData, updated_at: new Date().toISOString() }).eq('id', editingSlaRule.id);
        if (error) throw error;
        toast({ title: 'SLA Rule Updated' });
      } else {
        const { error } = await supabase.from('sla_rules').insert(ruleData);
        if (error) throw error;
        toast({ title: 'SLA Rule Created' });
      }

      setSlaRuleDialogOpen(false);
      setEditingSlaRule(null);
      await fetchSlaRules();
      showCrossUpdateWarning('sla');
    } catch (error) {
      console.error('Error saving SLA rule:', error);
      toast({ title: 'Error saving SLA rule', variant: 'destructive' });
    }
  };

  const handleDeleteSlaRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SLA rule?')) return;
    try {
      const { error } = await supabase.from('sla_rules').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'SLA Rule Deleted' });
      fetchSlaRules();
    } catch (error) {
      toast({ title: 'Error deleting SLA rule', variant: 'destructive' });
    }
  };

  // ─── Derived ──────────────────────────────────────────────────────────────────

  const filteredUsersByTeam = issueTypeForm.default_team_id
    ? users.filter(u => u.team_id === issueTypeForm.default_team_id)
    : users;

  const filteredTier2Users = routingRuleForm.region_id
    ? users.filter(u => u.region_id === routingRuleForm.region_id)
    : users;

  // ─── Access Denied ────────────────────────────────────────────────────────────

  if (accessDenied) {
    return (
      <div className="flex items-center justify-center h-64 flex-col gap-3">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <p className="text-lg font-semibold text-foreground">Access Denied</p>
        <p className="text-sm text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
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

        {/* ── Issue Types Tab ───────────────────────────────────────────────── */}
        <TabsContent value="issue-types" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Configure issue types — SLA rules are auto-generated on save</p>
            <Button onClick={() => handleOpenIssueTypeDialog()}>
              <Plus className="w-4 h-4 mr-2" /> Add Issue Type
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
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : issueTypes.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No issue types found.</TableCell></TableRow>
                ) : issueTypes.map(type => (
                  <TableRow key={type.id}>
                    <TableCell className="text-2xl">{type.icon}</TableCell>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>{type.default_sla_hours}h</TableCell>
                    <TableCell>{type.assignee?.full_name || '-'}</TableCell>
                    <TableCell>{type.team?.name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleOpenIssueTypeDialog(type)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => handleDeleteIssueType(type.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Routing Rules Tab ─────────────────────────────────────────────── */}
        <TabsContent value="routing" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Configure ticket routing and auto-assignment</p>
            <Button onClick={() => handleOpenRoutingRuleDialog()}>
              <Plus className="w-4 h-4 mr-2" /> Add Routing Rule
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
                  <TableHead>Tier 1 Assignee</TableHead>
                  <TableHead>Tier 2 Watcher</TableHead>
                  <TableHead>Auto-Group</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : routingRules.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No routing rules found.</TableCell></TableRow>
                ) : routingRules.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.priority_order}</TableCell>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>{rule.issue_type?.name || 'All'}</TableCell>
                    <TableCell>{rule.region?.name || 'All'}</TableCell>
                    <TableCell>{rule.assign_to_user?.full_name || rule.assign_to_team?.name || '-'}</TableCell>
                    <TableCell>{rule.tier2_user?.full_name || '-'}</TableCell>
                    <TableCell>
                      {rule.enable_auto_grouping
                        ? <span className="text-green-600 text-xs font-medium">Yes</span>
                        : <span className="text-muted-foreground text-xs">No</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleOpenRoutingRuleDialog(rule)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => handleDeleteRoutingRule(rule.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── SLA Rules Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="sla-rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Override SLA settings by priority and issue type</p>
            <Button onClick={() => handleOpenSlaRuleDialog()}>
              <Plus className="w-4 h-4 mr-2" /> Add SLA Rule
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
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : slaRules.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No SLA rules found.</TableCell></TableRow>
                ) : slaRules.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.issue_type?.name || 'All'}</TableCell>
                    <TableCell>
                      <span className={`capitalize px-2 py-0.5 rounded text-xs font-medium ${
                        rule.priority === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        rule.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                        rule.priority === 'normal' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-secondary text-muted-foreground'
                      }`}>
                        {rule.priority}
                      </span>
                    </TableCell>
                    <TableCell>{rule.sla_hours}h</TableCell>
                    <TableCell>{rule.escalation_threshold_percent}%</TableCell>
                    <TableCell>{rule.tier2_team?.name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleOpenSlaRuleDialog(rule)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => handleDeleteSlaRule(rule.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Issue Type Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={issueTypeDialogOpen} onOpenChange={setIssueTypeDialogOpen}>
        <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingIssueType ? 'Edit' : 'Add'} Issue Type</DialogTitle>
            <DialogDescription>SLA rules for all priorities will be auto-generated on save.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="e.g., Pickup Request" value={issueTypeForm.name} onChange={e => setIssueTypeForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Icon (Emoji)</Label>
              <Input placeholder="📦" value={issueTypeForm.icon} onChange={e => setIssueTypeForm(p => ({ ...p, icon: e.target.value }))} maxLength={2} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Brief description" value={issueTypeForm.description} onChange={e => setIssueTypeForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Default SLA (hours) *</Label>
              <Select value={issueTypeForm.default_sla_hours} onValueChange={handleSlaHoursChange}>
                <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {[2, 4, 6, 12, 24, 48, 72, 168, 336].map(h => (
                    <SelectItem key={h} value={h.toString()}>{h} hours{h >= 24 ? ` (${h/24} day${h/24 > 1 ? 's' : ''})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SLA Preview */}
            {slaPreview && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-xs font-semibold text-primary mb-2">Auto-generated SLA Rules:</p>
                <div className="grid grid-cols-4 gap-2">
                  {(['critical', 'high', 'normal', 'low'] as const).map(p => (
                    <div key={p} className="text-center">
                      <p className="text-xs text-muted-foreground capitalize">{p}</p>
                      <p className="text-sm font-bold text-foreground">{slaPreview[p]}h</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Default Team (Tier 1)</Label>
              <Select value={issueTypeForm.default_team_id} onValueChange={v => setIssueTypeForm(p => ({ ...p, default_team_id: v, default_assignee_id: '' }))}>
                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Assignee (Tier 1)</Label>
              <Select value={issueTypeForm.default_assignee_id} onValueChange={v => setIssueTypeForm(p => ({ ...p, default_assignee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">No assignee</SelectItem>
                  {filteredUsersByTeam.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}{u.team?.name ? ` (${u.team.name})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueTypeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveIssueType} disabled={!issueTypeForm.name || !issueTypeForm.default_sla_hours}>
              <Save className="w-4 h-4 mr-2" /> {editingIssueType ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Routing Rule Dialog ───────────────────────────────────────────────── */}
      <Dialog open={routingRuleDialogOpen} onOpenChange={setRoutingRuleDialogOpen}>
        <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingRoutingRule ? 'Edit' : 'Add'} Routing Rule</DialogTitle>
            <DialogDescription>Configure ticket routing with Tier 1 assignee and Tier 2 watcher.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input placeholder="e.g., Lahore Pickups" value={routingRuleForm.name} onChange={e => setRoutingRuleForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Issue Type</Label>
              <Select value={routingRuleForm.issue_type_id} onValueChange={v => setRoutingRuleForm(p => ({ ...p, issue_type_id: v }))}>
                <SelectTrigger><SelectValue placeholder="All issue types" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">All issue types</SelectItem>
                  {issueTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={routingRuleForm.region_id} onValueChange={v => setRoutingRuleForm(p => ({ ...p, region_id: v }))}>
                <SelectTrigger><SelectValue placeholder="All regions" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">All regions</SelectItem>
                  {regions.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tier 1 Team</Label>
              <Select value={routingRuleForm.assign_to_team_id} onValueChange={v => setRoutingRuleForm(p => ({ ...p, assign_to_team_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tier 1 Assignee</Label>
              <Select value={routingRuleForm.assign_to_user_id} onValueChange={v => setRoutingRuleForm(p => ({ ...p, assign_to_user_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">No individual assignee</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}{u.region?.name ? ` (${u.region.name})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tier 2 Watcher</Label>
              <Select value={routingRuleForm.tier2_user_id} onValueChange={v => setRoutingRuleForm(p => ({ ...p, tier2_user_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select watcher" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">No watcher</SelectItem>
                  {filteredTier2Users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}{u.region?.name ? ` (${u.region.name})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority Order</Label>
              <Input type="number" placeholder="0" value={routingRuleForm.priority_order} onChange={e => setRoutingRuleForm(p => ({ ...p, priority_order: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Lower = higher priority. Rules evaluated in order.</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded">
              <div>
                <Label>Enable Auto-Grouping</Label>
                <p className="text-xs text-muted-foreground">Group tickets by issue type + region</p>
              </div>
              <Switch checked={routingRuleForm.enable_auto_grouping} onCheckedChange={v => setRoutingRuleForm(p => ({ ...p, enable_auto_grouping: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoutingRuleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRoutingRule} disabled={!routingRuleForm.name}>
              <Save className="w-4 h-4 mr-2" /> {editingRoutingRule ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── SLA Rule Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={slaRuleDialogOpen} onOpenChange={setSlaRuleDialogOpen}>
        <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingSlaRule ? 'Edit' : 'Add'} SLA Rule</DialogTitle>
            <DialogDescription>Override default SLA based on priority and issue type.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Issue Type</Label>
              <Select value={slaRuleForm.issue_type_id} onValueChange={v => setSlaRuleForm(p => ({ ...p, issue_type_id: v }))}>
                <SelectTrigger><SelectValue placeholder="All issue types" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">All issue types</SelectItem>
                  {issueTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority *</Label>
              <Select value={slaRuleForm.priority} onValueChange={v => setSlaRuleForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SLA Hours *</Label>
              <Select value={slaRuleForm.sla_hours} onValueChange={v => setSlaRuleForm(p => ({ ...p, sla_hours: v }))}>
                <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {[1, 2, 4, 6, 12, 24, 48, 72, 168].map(h => (
                    <SelectItem key={h} value={h.toString()}>{h} hour{h > 1 ? 's' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Escalation Threshold (%)</Label>
              <Input type="number" placeholder="80" min="0" max="100" value={slaRuleForm.escalation_threshold_percent} onChange={e => setSlaRuleForm(p => ({ ...p, escalation_threshold_percent: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Auto-escalate when SLA is {slaRuleForm.escalation_threshold_percent}% consumed</p>
            </div>
            <div className="space-y-2">
              <Label>Tier 2 Team (Escalation)</Label>
              <Select value={slaRuleForm.tier2_team_id} onValueChange={v => setSlaRuleForm(p => ({ ...p, tier2_team_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlaRuleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSlaRule} disabled={!slaRuleForm.sla_hours}>
              <Save className="w-4 h-4 mr-2" /> {editingSlaRule ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cross Update Warning Dialog ───────────────────────────────────────── */}
      <Dialog open={warningDialogOpen} onOpenChange={setWarningDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Check Related Settings
            </DialogTitle>
            <DialogDescription>
              You just updated {warningContext === 'issue-type' ? 'an Issue Type' : warningContext === 'routing' ? 'a Routing Rule' : 'an SLA Rule'}.
              Review the related settings below to make sure everything is still consistent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {warningContext !== 'issue-type' && (
              <label className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors">
                <input type="checkbox" checked={warningChecks.issueType} onChange={e => setWarningChecks(p => ({ ...p, issueType: e.target.checked }))} className="h-4 w-4 mt-0.5 accent-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Issue Types</p>
                  <p className="text-xs text-muted-foreground">Default assignee and SLA hours still correct?</p>
                </div>
                {warningChecks.issueType && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />}
              </label>
            )}

            {warningContext !== 'routing' && (
              <label className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors">
                <input type="checkbox" checked={warningChecks.routing} onChange={e => setWarningChecks(p => ({ ...p, routing: e.target.checked }))} className="h-4 w-4 mt-0.5 accent-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Routing Rules</p>
                  <p className="text-xs text-muted-foreground">Assignment rules still match the updated config?</p>
                  {affectedRoutingRules.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {affectedRoutingRules.map(r => (
                        <Badge key={r.id} variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">{r.name}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                {warningChecks.routing && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />}
              </label>
            )}

            {warningContext !== 'sla' && (
              <label className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors">
                <input type="checkbox" checked={warningChecks.sla} onChange={e => setWarningChecks(p => ({ ...p, sla: e.target.checked }))} className="h-4 w-4 mt-0.5 accent-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">SLA Rules</p>
                  <p className="text-xs text-muted-foreground">SLA hours and escalation thresholds still valid?</p>
                  {affectedSlaRules.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {affectedSlaRules.map(r => (
                        <Badge key={r.id} variant="outline" className="text-xs">{r.priority} — {r.sla_hours}h</Badge>
                      ))}
                    </div>
                  )}
                </div>
                {warningChecks.sla && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />}
              </label>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWarningDialogOpen(false)}>Skip</Button>
            <Button onClick={() => setWarningDialogOpen(false)}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}