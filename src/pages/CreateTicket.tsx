import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

export default function CreateTicket() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [issueTypes, setIssueTypes] = useState([]);
  const [cities, setCities] = useState([]);
  
  // Form state
  const [issueTypeId, setIssueTypeId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [city, setCity] = useState('');
  const [priority, setPriority] = useState('normal');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  // Auto-assignment preview
  const [assignmentPreview, setAssignmentPreview] = useState(null);

  useEffect(() => {
    fetchInitialData();
    
    // Get params from URL (from parent app)
    const supplierIdParam = searchParams.get('supplier_id');
    const supplierNameParam = searchParams.get('supplier_name');
    const cityParam = searchParams.get('city');
    
    if (supplierIdParam) setSupplierId(supplierIdParam);
    if (supplierNameParam) setSupplier(supplierNameParam);
    if (cityParam) setCity(cityParam);
  }, [searchParams]);

  useEffect(() => {
    if (issueTypeId && city) {
      calculateAssignment();
    }
  }, [issueTypeId, city]);

  const fetchInitialData = async () => {
    try {
      // Fetch issue types
      const { data: issueTypesData, error: issueError } = await supabase
        .from('issue_types')
        .select(`
          *,
          team:teams!default_team_id(name),
          assignee:profiles!issue_types_default_assignee_id_fkey(full_name)
        `)
        .eq('is_active', true)
        .order('name');

      if (issueError) throw issueError;

      // Fetch cities
      const { data: citiesData, error: citiesError } = await supabase
        .from('city_region_mapping')
        .select('city_name')
        .order('city_name');

      if (citiesError) throw citiesError;

      setIssueTypes(issueTypesData || []);
      setCities(citiesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Error loading form data", variant: "destructive" });
    }
  };

  const calculateAssignment = async () => {
  try {
    const selectedIssueType = issueTypes.find(t => t.id === issueTypeId);
    if (!selectedIssueType) return;

    // Get region for this city
    const { data: cityMapping } = await supabase
      .from('city_region_mapping')
      .select('region_id')
      .eq('city_name', city)
      .single();

    if (!cityMapping?.region_id) {
      setAssignmentPreview(null);
      return;
    }

    // Get region details
    const { data: region } = await supabase
      .from('regions')
      .select('id, name, manager_id')
      .eq('id', cityMapping.region_id)
      .single();

    // Get manager name
    let managerName = 'No manager';
    if (region?.manager_id) {
      const { data: manager } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', region.manager_id)
        .single();
      
      managerName = manager?.full_name || 'No manager';
    }

    // Get city team for this region (Tier 2)
    const { data: tier2Team } = await supabase
      .from('teams')
      .select('id, name')
      .eq('team_type', 'city_team')
      .eq('region_id', cityMapping.region_id)
      .maybeSingle();

    setAssignmentPreview({
      tier1_assignee: selectedIssueType.assignee?.full_name || 'Unassigned',
      tier1_team: selectedIssueType.team?.name || 'No team',
      region: region?.name || 'Unknown region',
      city_manager: managerName,
      tier2_team: tier2Team?.name || 'No city team',
      sla_hours: selectedIssueType.default_sla_hours
    });
      } catch (error) {
        console.error('Error calculating assignment:', error);
        setAssignmentPreview(null);
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const selectedIssueType = issueTypes.find(t => t.id === issueTypeId);
      if (!selectedIssueType) throw new Error('Issue type not found');

      // Get region mapping for city
      const { data: cityMapping } = await supabase
        .from('city_region_mapping')
        .select('region_id')
        .eq('city_name', city)
        .single();

      if (!cityMapping) {
        toast({
          title: "City not mapped",
          description: "This city needs to be mapped to a region first.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Get city team for Tier 2
      const { data: tier2Team } = await supabase
        .from('teams')
        .select('id')
        .eq('team_type', 'city_team')
        .eq('region_id', cityMapping.region_id)
        .single();

      // Calculate SLA due date
      const slaHours = selectedIssueType.default_sla_hours;
      const slaDueAt = new Date();
      slaDueAt.setHours(slaDueAt.getHours() + slaHours);

      // Create ticket
      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          subject,
          description,
          issue_type_id: issueTypeId,
          supplier_name: supplier,
          supplier_id: supplierId || null,
          city,
          supplier_city: city,
          region_id: cityMapping.region_id,
          priority,
          status: 'new',
          assigned_to: selectedIssueType.default_assignee_id,
          team_id: selectedIssueType.default_team_id,
          tier2_team_id: tier2Team?.id || null,
          sla_due_at: slaDueAt.toISOString(),
          sla_status: 'on_track',
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Ticket Created",
        description: `Ticket #${ticket.ticket_number} has been created successfully.`,
      });
      
      navigate('/tickets');
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({ 
        title: "Error creating ticket", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/tickets')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Tickets
      </Button>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Create New Ticket</h1>
        <p className="text-muted-foreground mt-1">Submit a new issue or request</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-6 space-y-5">
          {/* Issue Type */}
          <div className="space-y-2">
            <Label htmlFor="issueType">Issue Type *</Label>
            <Select value={issueTypeId} onValueChange={setIssueTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {issueTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <span className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Supplier */}
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier Name *</Label>
            <Input
              id="supplier"
              placeholder="Enter supplier name"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {cities.map((c) => (
                  <SelectItem key={c.city_name} value={c.city_name}>
                    {c.city_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority *</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="low">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                    Low
                  </span>
                </SelectItem>
                <SelectItem value="normal">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    Normal
                  </span>
                </SelectItem>
                <SelectItem value="high">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    High
                  </span>
                </SelectItem>
                <SelectItem value="critical">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-danger" />
                    Critical
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              placeholder="Brief description of the issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Provide detailed information about the issue..."
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports: Images, PDFs, Documents (max 10MB)
              </p>
            </div>
          </div>
        </div>

        {/* Auto-assignment Preview */}
        {assignmentPreview && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-foreground">Auto-Assignment Preview</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Tier 1 (Specialist):</span>
                <p className="font-medium text-foreground">{assignmentPreview.tier1_assignee}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tier 1 (Team):</span>
                <p className="font-medium text-foreground">{assignmentPreview.tier1_team}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Region:</span>
                <p className="font-medium text-foreground">{assignmentPreview.region}</p>
              </div>
              <div>
                <span className="text-muted-foreground">City Manager:</span>
                <p className="font-medium text-foreground">{assignmentPreview.city_manager}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tier 2 (Escalation):</span>
                <p className="font-medium text-foreground">{assignmentPreview.tier2_team}</p>
              </div>
              <div>
                <span className="text-muted-foreground">SLA:</span>
                <p className="font-medium text-foreground">{assignmentPreview.sla_hours} hours</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/tickets')}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!issueTypeId || !supplier || !city || !subject || !description || loading}
          >
            {loading ? 'Creating...' : 'Create Ticket'}
          </Button>
        </div>
      </form>
    </div>
  );
}