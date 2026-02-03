import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

// Hardcoded for now (will come from parent app later)
const suppliers = [
  "Supplier A - FastTech Electronics",
  "Supplier B - Global Goods Co",
  "Supplier C - Prime Parts Ltd",
  "Supplier D - QuickShip Solutions",
  "Supplier E - Metro Distributors",
  "Supplier F - Digital Dynamics",
  "Supplier G - ValueMart",
  "Supplier H - Crystal Imports",
  "Supplier I - TechZone",
  "Supplier J - Home Essentials",
  "Supplier K - Allied Trading",
];

const cities = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan"];

export default function CreateTicket() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [issueTypes, setIssueTypes] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Form state
  const [issueTypeId, setIssueTypeId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [city, setCity] = useState('');
  const [priority, setPriority] = useState('normal');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const selectedIssueType = issueTypes.find((t) => t.id === issueTypeId);
  
  // Calculate auto-assignee
  const autoAssignee = selectedIssueType?.team_members?.[0]?.full_name || 
                       selectedIssueType?.team?.name || 
                       'Auto-assigned';

  // Fetch issue types
  useEffect(() => {
    const fetchIssueTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('issue_types')
          .select(`
            *,
            team:teams!default_team_id(name)
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

    fetchIssueTypes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate SLA due date
      const slaHours = selectedIssueType.default_sla_hours;
      const slaDueAt = new Date();
      slaDueAt.setHours(slaDueAt.getHours() + slaHours);

      // Get team and assignee from issue type
      const teamId = selectedIssueType.default_team_id;
      
      // Find first member of that team to assign
      const { data: teamMembers } = await supabase
        .from('profiles')
        .select('id')
        .eq('team_id', teamId)
        .limit(1);

      const assignedTo = teamMembers?.[0]?.id || null;

      // Create ticket
      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          subject,
          description,
          issue_type_id: issueTypeId,
          supplier_name: supplier,
          city,
          priority,
          status: 'new',
          assigned_to: assignedTo,
          team_id: teamId,
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
            <Label htmlFor="supplier">Supplier *</Label>
            <Select value={supplier} onValueChange={setSupplier}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {suppliers.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <SelectItem key={c} value={c}>{c}</SelectItem>
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
        {issueTypeId && selectedIssueType && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Will be assigned to:</span>
              <span className="font-medium text-foreground">{autoAssignee}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-muted-foreground">Expected resolution:</span>
              <span className="font-medium text-foreground">{selectedIssueType.default_sla_hours} hours</span>
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