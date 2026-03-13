import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Plus, Trash2, Megaphone, Search, Link, X, PackageX,
  Upload, FileImage, FileVideo, FileText, File, ExternalLink,
} from 'lucide-react';
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
type AttachmentKind = 'link' | 'file';

interface Attachment {
  kind: AttachmentKind;
  label: string;
  url: string;
  mime_type?: string;
  size_bytes?: number;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  error?: string;
  done: boolean;
  attachment?: Attachment;
}

interface Broadcast {
  id: string;
  title: string;
  message: string;
  category: string;
  broadcast_type: string;
  target_type: string;
  target_value: string | null;
  is_urgent: boolean;
  created_at: string;
  expires_at: string | null;
  created_by: string;
  attachments: Attachment[];
  creator?: { full_name: string };
}

interface Region   { id: string; name: string; }
interface City     { id: string; city_name: string; }
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
  { value: 'all',      label: 'All Suppliers'     },
  { value: 'city',     label: 'By City'           },
  { value: 'region',   label: 'By Region'         },
  { value: 'supplier', label: 'Specific Supplier' },
];

const CATEGORY_COLORS: Record<string, string> = {
  update:   'bg-blue-100 text-blue-700',
  delivery: 'bg-green-100 text-green-700',
  pickups:  'bg-yellow-100 text-yellow-700',
  offer:    'bg-purple-100 text-purple-700',
  listing:  'bg-orange-100 text-orange-700',
};

const MAX_FILE_SIZE_MB = 50;
const MAX_ATTACHMENTS  = 5;

const ACCEPTED = [
  'image/*', 'video/*', 'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
].join(',');

// ─── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2);

const fileIcon = (mime?: string) => {
  if (!mime) return <File className="w-4 h-4 text-muted-foreground" />;
  if (mime.startsWith('image/')) return <FileImage className="w-4 h-4 text-pink-500" />;
  if (mime.startsWith('video/')) return <FileVideo className="w-4 h-4 text-blue-500" />;
  if (mime.includes('pdf'))      return <FileText  className="w-4 h-4 text-red-500"  />;
  return <File className="w-4 h-4 text-muted-foreground" />;
};

const fmtSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function Broadcasts() {
  const [loading,     setLoading]     = useState(true);
  const [broadcasts,  setBroadcasts]  = useState<Broadcast[]>([]);
  const [regions,     setRegions]     = useState<Region[]>([]);
  const [cities,      setCities]      = useState<City[]>([]);
  const [suppliers,   setSuppliers]   = useState<Supplier[]>([]);
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [search,      setSearch]      = useState('');
  const [filterCat,   setFilterCat]   = useState('all');
  const [filterType,  setFilterType]  = useState('all');
  const [currentUser, setCurrentUser] = useState<string>('');

  // Form
  const [title,         setTitle]         = useState('');
  const [message,       setMessage]       = useState('');
  const [category,      setCategory]      = useState('update');
  const [broadcastType, setBroadcastType] = useState<'general' | 'customer_return'>('general');
  const [targetType,    setTargetType]    = useState('all');
  const [targetValue,   setTargetValue]   = useState('');
  const [isUrgent,      setIsUrgent]      = useState(false);
  const [expiresAt,     setExpiresAt]     = useState('');
  const [submitting,    setSubmitting]    = useState(false);

  // Attachments
  const [linkRows,        setLinkRows]        = useState<{ id: string; label: string; url: string }[]>([]);
  const [uploadingFiles,  setUploadingFiles]  = useState<UploadingFile[]>([]);
  const [doneAttachments, setDoneAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supplier search
  const [supplierSearch,    setSupplierSearch]    = useState('');
  const [supplierDropOpen,  setSupplierDropOpen]  = useState(false);
  const [selectedSupplier,  setSelectedSupplier]  = useState<Supplier | null>(null);
  const supplierRef = useRef<HTMLDivElement>(null);

  const filteredSuppliers = suppliers.filter((s) => {
    const q = supplierSearch.toLowerCase();
    return (
      s.business_name.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.supplier_uid.toLowerCase().includes(q)
    );
  }).slice(0, 20); // cap dropdown to 20 results

  // Close supplier dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) {
        setSupplierDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const totalAttachments = linkRows.filter(l => l.url.trim()).length + doneAttachments.length;
  const uploading        = uploadingFiles.some(f => !f.done);

  useEffect(() => { fetchData(); getCurrentUser(); }, []);

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
        supabase.from('suppliers').select('id, supplier_uid, business_name, city')
          .eq('is_active', true).order('business_name'),
      ]);
      setBroadcasts(broadcastsRes.data || []);
      setRegions(regionsRes.data     || []);
      setCities(citiesRes.data       || []);
      setSuppliers(suppliersRes.data || []);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error loading broadcasts', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle(''); setMessage(''); setCategory('update');
    setBroadcastType('general'); setTargetType('all'); setTargetValue('');
    setIsUrgent(false); setExpiresAt('');
    setLinkRows([]); setUploadingFiles([]); setDoneAttachments([]);
    setSupplierSearch(''); setSelectedSupplier(null); setSupplierDropOpen(false);
  };

  // ── Link rows ────────────────────────────────────────────────────────────────
  const addLinkRow = () => {
    if (totalAttachments >= MAX_ATTACHMENTS) return;
    setLinkRows(prev => [...prev, { id: uid(), label: '', url: '' }]);
  };
  const updateLinkRow = (id: string, field: 'label' | 'url', val: string) =>
    setLinkRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  const removeLinkRow = (id: string) =>
    setLinkRows(prev => prev.filter(r => r.id !== id));

  // ── File upload ──────────────────────────────────────────────────────────────
  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';

    const valid  = files.filter(f => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024);
    const tooBig = files.filter(f => f.size >  MAX_FILE_SIZE_MB * 1024 * 1024);
    if (tooBig.length) {
      toast({ title: `${tooBig.length} file(s) exceed ${MAX_FILE_SIZE_MB} MB and were skipped`, variant: 'destructive' });
    }

    const slots    = MAX_ATTACHMENTS - totalAttachments;
    const toUpload = valid.slice(0, slots);
    if (valid.length > slots) {
      toast({ title: `Max ${MAX_ATTACHMENTS} attachments — only ${slots} added`, variant: 'destructive' });
    }
    if (!toUpload.length) return;

    const placeholders: UploadingFile[] = toUpload.map(f => ({
      id: uid(), name: f.name, progress: 0, done: false,
    }));
    setUploadingFiles(prev => [...prev, ...placeholders]);

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      const ph   = placeholders[i];
      const path = `broadcast-attachments/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

      try {
        const ticker = setInterval(() => {
          setUploadingFiles(prev => prev.map(u =>
            u.id === ph.id && u.progress < 85 ? { ...u, progress: u.progress + 15 } : u
          ));
        }, 300);

        const { error } = await supabase.storage
          .from('broadcast-media')
          .upload(path, file, { cacheControl: '3600', upsert: false });

        clearInterval(ticker);
        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('broadcast-media')
          .getPublicUrl(path);

        const attachment: Attachment = {
          kind: 'file', label: file.name, url: publicUrl,
          mime_type: file.type, size_bytes: file.size,
        };

        setUploadingFiles(prev => prev.map(u =>
          u.id === ph.id ? { ...u, progress: 100, done: true, attachment } : u
        ));
        setDoneAttachments(prev => [...prev, attachment]);

      } catch (err) {
        console.error(err);
        setUploadingFiles(prev => prev.map(u =>
          u.id === ph.id ? { ...u, done: true, error: 'Upload failed' } : u
        ));
        toast({ title: `Failed to upload ${file.name}`, variant: 'destructive' });
      }
    }
  };

  const removeUploadedFile = (url: string) => {
    setDoneAttachments(prev => prev.filter(a => a.url !== url));
    setUploadingFiles(prev => prev.filter(u => u.attachment?.url !== url));
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!title.trim())   { toast({ title: 'Title is required',   variant: 'destructive' }); return; }
    if (!message.trim()) { toast({ title: 'Message is required', variant: 'destructive' }); return; }
    if (targetType !== 'all' && !targetValue) {
      toast({ title: 'Please select a target', variant: 'destructive' }); return;
    }
    if (uploading) {
      toast({ title: 'Please wait for uploads to finish', variant: 'destructive' }); return;
    }

    let linkAttachments: Attachment[] = [];
    try {
      linkAttachments = linkRows
        .filter(r => r.url.trim())
        .map(r => {
          try { new URL(r.url); } catch {
            throw new Error(`Invalid URL: ${r.url}`);
          }
          return { kind: 'link' as const, label: r.label || r.url, url: r.url };
        });
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' }); return;
    }

    const allAttachments = broadcastType === 'customer_return'
      ? [...doneAttachments, ...linkAttachments]
      : [];

    setSubmitting(true);
    try {
      const { error } = await supabase.from('broadcasts').insert({
        title:          title.trim(),
        message:        message.trim(),
        category,
        broadcast_type: broadcastType,
        target_type:    targetType,
        target_value:   targetType === 'all' ? null : targetValue,
        is_urgent:      isUrgent,
        expires_at:     broadcastType === 'general' ? (expiresAt || null) : null,
        created_by:     currentUser,
        attachments:    allAttachments,
      });
      if (error) throw error;
      toast({ title: 'Broadcast sent successfully' });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error sending broadcast', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, bTitle: string) => {
    if (!confirm(`Delete broadcast "${bTitle}"? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('broadcasts').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Broadcast deleted' });
      fetchData();
    } catch {
      toast({ title: 'Error deleting broadcast', variant: 'destructive' });
    }
  };

  const filtered = broadcasts.filter((b) => {
    const matchSearch = search === '' ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.message.toLowerCase().includes(search.toLowerCase());
    const matchCat  = filterCat  === 'all' || b.category       === filterCat;
    const matchType = filterType === 'all' || b.broadcast_type === filterType;
    return matchSearch && matchCat && matchType;
  });

  const getTargetLabel = (b: Broadcast) => {
    if (b.target_type === 'all')      return 'All Suppliers';
    if (b.target_type === 'city')     return `City: ${b.target_value}`;
    if (b.target_type === 'region')   return `Region: ${b.target_value}`;
    if (b.target_type === 'supplier') return `Supplier: ${b.target_value}`;
    return b.target_value;
  };

  if (loading) return (
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

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Broadcasts</h1>
          <p className="text-muted-foreground mt-1">Send announcements to suppliers</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Broadcast
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search broadcasts..." className="pl-9"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="customer_return">Customer Return</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
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
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No broadcasts found
                </TableCell>
              </TableRow>
            ) : filtered.map((b) => (
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
                    {b.broadcast_type === 'customer_return' && b.attachments?.length > 0 && (
                      <p className="text-xs text-blue-500 mt-0.5">
                        {b.attachments.length} attachment{b.attachments.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {b.broadcast_type === 'customer_return' ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                      <PackageX className="w-3 h-3" /> Return
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                      General
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${CATEGORY_COLORS[b.category] ?? 'bg-muted text-muted-foreground'}`}>
                    {b.category}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{getTargetLabel(b)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{b.creator?.full_name ?? '-'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(b.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {b.expires_at ? format(new Date(b.expires_at), 'MMM d, yyyy') : '—'}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon"
                    className="w-8 h-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(b.id, b.title)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Create Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Broadcast</DialogTitle>
            <DialogDescription>Send an announcement to suppliers</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">

            {/* Type toggle */}
            <div className="flex gap-2">
              {(['general', 'customer_return'] as const).map((t) => (
                <button key={t} type="button"
                  onClick={() => setBroadcastType(t)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    broadcastType === t
                      ? t === 'customer_return'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/40'
                  }`}>
                  {t === 'customer_return' && <PackageX className="w-4 h-4" />}
                  {t === 'general' ? 'General' : 'Customer Return'}
                </button>
              ))}
            </div>

            {broadcastType === 'customer_return' && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                This broadcast is <strong>permanently stored</strong> in the supplier's Returns history and never expires.
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                placeholder={broadcastType === 'customer_return'
                  ? 'e.g. Return Policy Update – May 2025'
                  : 'e.g. New pickup schedule for Karachi'}
                value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label>Message <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder={broadcastType === 'customer_return'
                  ? 'Describe the return details, instructions, or policy...'
                  : 'Write your announcement...'}
                className="min-h-[100px] resize-none"
                value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>

            {/* ── Attachments — customer_return only ── */}
            {broadcastType === 'customer_return' && (
              <div className="space-y-3">
                <Label>
                  Attachments{' '}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({totalAttachments}/{MAX_ATTACHMENTS} — images, videos, PDFs, docs, or links)
                  </span>
                </Label>

                {/* Upload zone */}
                {totalAttachments < MAX_ATTACHMENTS && (
                  <>
                    <input ref={fileInputRef} type="file" multiple accept={ACCEPTED}
                      className="hidden" onChange={handleFilePick} />
                    <button type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center gap-1.5 text-muted-foreground hover:border-primary/50 hover:bg-secondary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      <Upload className="w-5 h-5" />
                      <span className="text-sm font-medium">Click to upload files</span>
                      <span className="text-xs">Images, videos, PDFs, Word, Excel — max {MAX_FILE_SIZE_MB} MB each</span>
                    </button>
                  </>
                )}

                {/* In-progress */}
                {uploadingFiles.filter(u => !u.done || u.error).map((u) => (
                  <div key={u.id} className="rounded-lg border border-border bg-secondary/20 px-3 py-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-foreground truncate flex-1">{u.name}</span>
                      {u.error && <span className="text-xs text-destructive shrink-0">{u.error}</span>}
                    </div>
                    {!u.error && <Progress value={u.progress} className="h-1.5" />}
                  </div>
                ))}

                {/* Completed files */}
                {doneAttachments.map((a) => (
                  <div key={a.url} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/20 px-3 py-2">
                    <span className="shrink-0">{fileIcon(a.mime_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{a.label}</p>
                      {a.size_bytes && <p className="text-[10px] text-muted-foreground">{fmtSize(a.size_bytes)}</p>}
                    </div>
                    <a href={a.url} target="_blank" rel="noreferrer"
                      className="shrink-0 text-muted-foreground hover:text-foreground">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button type="button" onClick={() => removeUploadedFile(a.url)}
                      className="shrink-0 text-muted-foreground hover:text-destructive">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Link rows */}
                {linkRows.map((row) => (
                  <div key={row.id} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1.5">
                      <Input placeholder="Label (e.g. Return Form, Video Guide)"
                        className="h-8 text-sm" value={row.label}
                        onChange={(e) => updateLinkRow(row.id, 'label', e.target.value)} />
                      <div className="relative">
                        <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input placeholder="https://..." className="h-8 text-sm pl-7" value={row.url}
                          onChange={(e) => updateLinkRow(row.id, 'url', e.target.value)} />
                      </div>
                    </div>
                    <button type="button" onClick={() => removeLinkRow(row.id)}
                      className="mt-1 text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {totalAttachments < MAX_ATTACHMENTS && (
                  <Button type="button" variant="ghost" size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground" onClick={addLinkRow}>
                    <Link className="w-3 h-3" /> Add a link instead
                  </Button>
                )}

                <p className="text-xs text-muted-foreground">
                  Suppliers will see all attachments as downloadable/viewable files and clickable links.
                </p>
              </div>
            )}

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Target */}
            <div className="space-y-2">
              <Label>Send To</Label>
              <Select value={targetType} onValueChange={(v) => { setTargetType(v); setTargetValue(''); setSelectedSupplier(null); setSupplierSearch(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {TARGET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {targetType === 'region' && (
              <div className="space-y-2">
                <Label>Select Region</Label>
                <Select value={targetValue} onValueChange={setTargetValue}>
                  <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {regions.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {targetType === 'city' && (
              <div className="space-y-2">
                <Label>Select City</Label>
                <Select value={targetValue} onValueChange={setTargetValue}>
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {cities.map(c => <SelectItem key={c.id} value={c.city_name}>{c.city_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {targetType === 'supplier' && (
              <div className="space-y-2">
                <Label>Select Supplier</Label>
                <div className="relative" ref={supplierRef}>
                  {/* Selected pill or search input */}
                  {selectedSupplier ? (
                    <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{selectedSupplier.business_name}</p>
                        <p className="text-xs text-muted-foreground">{selectedSupplier.city} · {selectedSupplier.supplier_uid}</p>
                      </div>
                      <button type="button"
                        className="text-muted-foreground hover:text-destructive ml-2 shrink-0"
                        onClick={() => { setSelectedSupplier(null); setTargetValue(''); setSupplierSearch(''); }}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, city, or UID..."
                        className="pl-9"
                        value={supplierSearch}
                        onChange={(e) => { setSupplierSearch(e.target.value); setSupplierDropOpen(true); }}
                        onFocus={() => setSupplierDropOpen(true)}
                      />
                    </div>
                  )}

                  {/* Dropdown results */}
                  {supplierDropOpen && !selectedSupplier && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-52 overflow-y-auto">
                      {filteredSuppliers.length === 0 ? (
                        <p className="px-3 py-4 text-sm text-center text-muted-foreground">No suppliers found</p>
                      ) : filteredSuppliers.map((s) => (
                        <button key={s.id} type="button"
                          className="w-full text-left px-3 py-2 hover:bg-secondary/50 transition-colors"
                          onClick={() => {
                            setSelectedSupplier(s);
                            setTargetValue(s.supplier_uid);
                            setSupplierDropOpen(false);
                            setSupplierSearch('');
                          }}>
                          <p className="text-sm font-medium text-foreground">{s.business_name}</p>
                          <p className="text-xs text-muted-foreground">{s.city} · {s.supplier_uid}</p>
                        </button>
                      ))}
                      {filteredSuppliers.length === 20 && (
                        <p className="px-3 py-2 text-xs text-center text-muted-foreground border-t border-border">
                          Showing top 20 — type more to narrow down
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Urgent + Expiry */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Switch id="urgent" checked={isUrgent} onCheckedChange={setIsUrgent} />
                <Label htmlFor="urgent" className="cursor-pointer">Mark as Urgent</Label>
              </div>
              {broadcastType === 'general' && (
                <div className="flex items-center gap-2 flex-1">
                  <Label className="shrink-0 text-xs text-muted-foreground">Expires</Label>
                  <Input type="date" className="h-8 text-sm"
                    value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                </div>
              )}
            </div>

            {broadcastType === 'customer_return' && (
              <p className="text-xs text-muted-foreground">
                Customer Return broadcasts never expire — permanently visible in the supplier's Returns history.
              </p>
            )}

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting || uploading}>
              {uploading ? 'Uploading...' : submitting ? 'Sending...' : 'Send Broadcast'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}