import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Megaphone, Search } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Broadcast {
  id: string;
  title: string;
  message: string;
  category: string;
  target_type: string;
  target_value: string | null;
  is_urgent: boolean;
  created_at: string;
  expires_at: string | null;
  created_by: string;
  creator?: { full_name: string };
}

interface Region  { id: string; name: string; }
interface City    { id: string; city_name: string; }
interface Supplier { id: string; supplier_uid: string; business_name: string; city: string; }

// ─── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'update',   label: 'Update'   },
  { value: 'delivery', label: 'Delivery' },
  { value: 'pickups',  label: 'Pickups'  },
  { value: 'offer',    label: 'Offer'    },
  { value: 'listing',  label: 'Listing'  },
];

const TARGET_TYPES = [
  { value: 'all',      label: 'All Suppliers' },
  { value: 'city',     label: 'By City'       },
  { value: 'region',   label: 'By Region'     },
  { value: 'supplier', label: 'Specific Supplier' },
];

const CATEGORY_COLORS: Record<string, string> = {
  update:   'bg-blue-100 text-blue-700',
  delivery: 'bg-green-100 text-green-700',
  pickups:  'bg-yellow-100 text-yellow-700',
  offer:    'bg-purple-100 text-purple-700',
  listing:  'bg-orange-100 text-orange-700',
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function Broadcasts() {
  const [loading,      setLoading]      = useState(true);
  const [broadcasts,   setBroadcasts]   = useState<Broadcast[]>([]);
  const [regions,      setRegions]      = useState<Region[]>([]);
  const [cities,       setCities]       = useState<City[]>([]);
  const [suppliers,    setSuppliers]    = useState<Supplier[]>([]);
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [search,       setSearch]       = useState('');
  const [filterCat,    setFilterCat]    = useState('all');
  const [currentUser,  setCurrentUser]  = useState<string>('');

  // Form state
  const [title,       setTitle]       = useState('');
  const [message,     setMessage]     = useState('');
  const [category,    setCategory]    = useState('update');
  const [targetType,  setTargetType]  = useState('all');
  const [targetValue, setTargetValue] = useState('');
  const [isUrgent,    setIsUrgent]    = useState(false);
  const [expiresAt,   setExpiresAt]   = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    fetchData();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUser(user.id);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [broadcastsRes, regionsRes, citiesRes, suppliersRes] = await Promise.all([
        supabase
          .from('broadcasts')
          .select('*, creator:profiles!broadcasts_created_by_fkey(full_name)')
          .order('created_at', { ascending: false }),
        supabase.from('regions').select('id, name').order('name'),
        supabase.from('city_region_mapping').select('id, city_name').order('city_name'),
        supabase.from('suppliers').select('id, supplier_uid, business_name, city').eq('is_active', true).order('business_name'),
      ]);

      setBroadcasts(broadcastsRes.data || []);
      setRegions(regionsRes.data || []);
      setCities(citiesRes.data || []);
      setSuppliers(suppliersRes.data || []);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error loading broadcasts', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setCategory('update');
    setTargetType('all');
    setTargetValue('');
    setIsUrgent(false);
    setExpiresAt('');
  };

  const handleOpenDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!title.trim())   { toast({ title: 'Title is required', variant: 'destructive' }); return; }
    if (!message.trim()) { toast({ title: 'Message is required', variant: 'destructive' }); return; }
    if (targetType !== 'all' && !targetValue) {
      toast({ title: 'Please select a target', variant: 'destructive' }); return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('broadcasts').insert({
        title:        title.trim(),
        message:      message.trim(),
        category,
        target_type:  targetType,
        target_value: targetType === 'all' ? null : targetValue,
        is_urgent:    isUrgent,
        expires_at:   expiresAt || null,
        created_by:   currentUser,
      });

      if (error) throw error;

      toast({ title: 'Broadcast sent successfully' });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error(error);
      toast({ title: 'Error sending broadcast', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete broadcast "${title}"? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('broadcasts').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Broadcast deleted' });
      fetchData();
    } catch (error) {
      toast({ title: 'Error deleting broadcast', variant: 'destructive' });
    }
  };

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filtered = broadcasts.filter((b) => {
    const matchSearch = search === '' ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.message.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || b.category === filterCat;
    return matchSearch && matchCat;
  });

  const getTargetLabel = (b: Broadcast) => {
    if (b.target_type === 'all')      return 'All Suppliers';
    if (b.target_type === 'city')     return `City: ${b.target_value}`;
    if (b.target_type === 'region')   return `Region: ${b.target_value}`;
    if (b.target_type === 'supplier') return `Supplier: ${b.target_value}`;
    return b.target_value;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Broadcasts</h1>
          <p className="text-muted-foreground mt-1">Loading...</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <p className="text-muted-foreground">Loading broadcasts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Broadcasts</h1>
          <p className="text-muted-foreground mt-1">Send announcements to suppliers</p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="w-4 h-4 mr-2" />
          New Broadcast
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search broadcasts..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Sent By</TableHead>
              <TableHead>Sent At</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No broadcasts found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">{b.title}</span>
                        {b.is_urgent && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 shrink-0">Urgent</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{b.message}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${CATEGORY_COLORS[b.category] ?? 'bg-muted text-muted-foreground'}`}>
                      {b.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getTargetLabel(b)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {b.creator?.full_name ?? '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(b.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {b.expires_at ? format(new Date(b.expires_at), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(b.id, b.title)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Broadcast</DialogTitle>
            <DialogDescription>Send an announcement to suppliers</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">

            {/* Title */}
            <div className="space-y-2">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. New pickup schedule for Karachi" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label>Message <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Write your announcement..."
                className="min-h-[100px] resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target type */}
            <div className="space-y-2">
              <Label>Send To</Label>
              <Select value={targetType} onValueChange={(v) => { setTargetType(v); setTargetValue(''); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {TARGET_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target value */}
            {targetType === 'region' && (
              <div className="space-y-2">
                <Label>Select Region</Label>
                <Select value={targetValue} onValueChange={setTargetValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {regions.map((r) => (
                      <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {targetType === 'city' && (
              <div className="space-y-2">
                <Label>Select City</Label>
                <Select value={targetValue} onValueChange={setTargetValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.city_name}>{c.city_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {targetType === 'supplier' && (
              <div className="space-y-2">
                <Label>Select Supplier</Label>
                <Select value={targetValue} onValueChange={setTargetValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.supplier_uid}>
                        {s.business_name} — {s.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Urgent + Expiry */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Switch id="urgent" checked={isUrgent} onCheckedChange={setIsUrgent} />
                <Label htmlFor="urgent" className="cursor-pointer">Mark as Urgent</Label>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Label className="shrink-0 text-xs text-muted-foreground">Expires</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Broadcast'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}