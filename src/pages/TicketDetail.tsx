import { useState, useEffect, useRef } from 'react';
import {
  ArrowUpRight, X, Eye, Send, AlertCircle,
  Paperclip, Download, FileText, Film, File, Copy, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { SLATimer } from '@/components/common/SLATimer';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CannedMessageDropdown } from '@/components/common/CannedMessageDropdown';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  comment_id?: string;
  ticket_id?: string;
}

interface Comment {
  id: string;
  content: string;
  is_internal: boolean;
  comment_source: 'agent' | 'supplier';
  created_at: string;
  user?: { full_name: string };
}

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description?: string;
  status: string;
  priority: string;
  supplier_name?: string;
  supplier_phone?: string;
  supplier_address?: string;
  supplier_order_count?: number;
  supplier_id?: string;
  city?: string;
  issue_type?: { name: string; icon: string };
  assigned_user?: { id: string; full_name: string };
  team?: { name: string };
  tier2_team?: { name: string };
  region?: { id: string; name: string; manager?: { full_name: string } };
  sla_due_at?: string;
  sla_status?: string;
  is_escalated?: boolean;
  manager_intervened?: boolean;
  created_at: string;
  assigned_to?: string;
  region_id?: string;
  resolved_at?: string;
  ticket_group_id?: string;
}

interface SupplierStats {
  total: number;
  active: number;
  resolved: number;
  avgPerDay: number;
  last7Days: number;
  last30Days: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileType(mimeType?: string, fileName?: string): 'image' | 'video' | 'pdf' | 'other' {
  const mime = mimeType || '';
  const name = fileName?.toLowerCase() || '';
  if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(name)) return 'image';
  if (mime.startsWith('video/') || /\.(mp4|webm|mov|avi)$/.test(name)) return 'video';
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  return 'other';
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const getInitials = (name?: string) =>
  (name || 'UN').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

// ─── Media Viewer ─────────────────────────────────────────────────────────────

function MediaViewer({ url, type, name, onClose }: {
  url: string; type: 'image' | 'video' | 'pdf'; name: string; onClose: () => void;
}) {
  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = name;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch { window.open(url, '_blank'); }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleDownload} className="text-white hover:bg-white/20">
            <Download className="w-5 h-5" />
          </Button>
          <span className="text-white/70 text-sm truncate max-w-[300px]">{name}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
          <X className="w-5 h-5" />
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4" onClick={onClose}>
        {type === 'image' && <img src={url} alt={name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />}
        {type === 'video' && <video src={url} controls autoPlay playsInline className="max-w-full max-h-full rounded-lg shadow-2xl" style={{ maxHeight: 'calc(100vh - 80px)' }} onClick={e => e.stopPropagation()} />}
        {type === 'pdf' && (
          <div className="w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <iframe src={url} className="w-full rounded-lg shadow-2xl bg-white" style={{ height: 'calc(100vh - 100px)', maxWidth: '900px' }} title={name} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Attachment Preview ───────────────────────────────────────────────────────

function AttachmentPreview({ attachment, onView }: { attachment: Attachment; onView: (a: Attachment) => void }) {
  const type = getFileType(attachment.mime_type, attachment.file_name);
  if (type === 'image') return (
    <button onClick={() => onView(attachment)} className="relative group rounded-lg overflow-hidden border border-border w-16 h-16 flex-shrink-0 hover:ring-2 hover:ring-primary transition-all">
      <img src={attachment.file_url} alt={attachment.file_name} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Eye className="w-4 h-4 text-white" />
      </div>
    </button>
  );
  if (type === 'video') return (
    <button onClick={() => onView(attachment)} className="relative group rounded-lg overflow-hidden border border-border w-16 h-16 flex-shrink-0 bg-secondary hover:ring-2 hover:ring-primary transition-all flex items-center justify-center">
      <Film className="w-6 h-6 text-muted-foreground" />
    </button>
  );
  if (type === 'pdf') return (
    <button onClick={() => onView(attachment)} className="relative group rounded-lg overflow-hidden border border-border w-16 h-16 flex-shrink-0 bg-secondary hover:ring-2 hover:ring-primary transition-all flex flex-col items-center justify-center gap-1 p-2">
      <FileText className="w-6 h-6 text-red-400" />
      <p className="text-xs text-muted-foreground truncate w-full text-center">{attachment.file_name}</p>
    </button>
  );
  return (
    <a href={attachment.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-colors text-sm">
      <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-foreground truncate max-w-[120px]">{attachment.file_name}</p>
        {attachment.file_size && <p className="text-xs text-muted-foreground">{formatFileSize(attachment.file_size)}</p>}
      </div>
      <Download className="w-3 h-3 text-muted-foreground flex-shrink-0" />
    </a>
  );
}

// ─── File Upload Preview ──────────────────────────────────────────────────────

function FileUploadPreview({ files, onRemove }: { files: File[]; onRemove: (i: number) => void }) {
  if (!files.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {files.map((file, i) => {
        const type = getFileType(file.type, file.name);
        const previewUrl = type === 'image' ? URL.createObjectURL(file) : null;
        return (
          <div key={i} className="relative group">
            {previewUrl
              ? <div className="w-14 h-14 rounded-lg overflow-hidden border border-border"><img src={previewUrl} alt={file.name} className="w-full h-full object-cover" /></div>
              : <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-secondary border border-border text-xs">
                  {type === 'pdf' ? <FileText className="w-3 h-3 text-red-400" /> : <File className="w-3 h-3 text-muted-foreground" />}
                  <span className="max-w-[80px] truncate text-foreground">{file.name}</span>
                </div>
            }
            <button onClick={() => onRemove(i)} className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface TicketDetailProps {
  ticketId?: string;
  embedded?: boolean;
  onClose?: () => void;
  onRefresh?: () => void;
}

export default function TicketDetail({ ticketId, embedded = false, onClose, onRefresh }: TicketDetailProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const addCommentRef = useRef<() => void>(() => {});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentAttachments, setCommentAttachments] = useState<Record<string, Attachment[]>>({});
  const [ticketAttachments, setTicketAttachments] = useState<Attachment[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [supplierStats, setSupplierStats] = useState<SupplierStats | null>(null);
  const [showResolvedBreakdown, setShowResolvedBreakdown] = useState(false);
  const [allSupplierTickets, setAllSupplierTickets] = useState<any[]>([]);
  const [showAllTicketsModal, setShowAllTicketsModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<{ open: boolean; url: string; type: 'image' | 'video' | 'pdf'; name: string }>({ open: false, url: '', type: 'image', name: '' });
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [escalationNote, setEscalationNote] = useState('');
  const [watchers, setWatchers] = useState<any[]>([]);
  const [cannedQuery, setCannedQuery] = useState<string | null>(null);

  // ── Keyboard shortcuts (ref trick avoids "used before declaration" TS error) ──
  useKeyboardShortcuts({
    onSendMessage: () => addCommentRef.current(),
    onCloseTicket: onClose,
    onAssignTicket: () => setReassignDialogOpen(true),
  });

  useEffect(() => {
    if (ticketId) fetchTicketData();
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`comments-${ticketId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `ticket_id=eq.${ticketId}`,
      }, () => { fetchTicketData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const fetchTicketData = async () => {
    if (!ticketId) return;
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      setCurrentUser(profile);

      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          issue_type:issue_types(name, icon),
          assigned_user:profiles!assigned_to(id, full_name),
          team:teams!tickets_team_id_fkey(name),
          tier2_team:teams!tier2_team_id(name),
          region:regions(id, name, manager:profiles!regions_manager_id_fkey(full_name))
        `)
        .eq('id', ticketId)
        .maybeSingle();
      if (ticketError) throw ticketError;
      if (!ticketData) { setLoading(false); return; }

      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, user:profiles(full_name)')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, team:teams!fk_team(name)')
        .eq('is_active', true)
        .order('full_name');

      const { data: ticketAttachmentsData } = await supabase
        .from('attachments').select('*').eq('ticket_id', ticketId).is('comment_id', null);

      const commentIds = (commentsData || []).map(c => c.id);
      let commentAttachmentsMap: Record<string, Attachment[]> = {};
      if (commentIds.length > 0) {
        const { data: commentAttachmentsData } = await supabase
          .from('attachments').select('*').in('comment_id', commentIds);
        (commentAttachmentsData || []).forEach((att: Attachment) => {
          if (!commentAttachmentsMap[att.comment_id!]) commentAttachmentsMap[att.comment_id!] = [];
          commentAttachmentsMap[att.comment_id!].push(att);
        });
      }

      setTicket(ticketData);
      setComments(commentsData || []);
      setUsers(usersData || []);
      setTicketAttachments(ticketAttachmentsData || []);
      setCommentAttachments(commentAttachmentsMap);

      if (ticketData?.ticket_group_id) {
        const { data: watchersData } = await supabase
          .from('ticket_watchers')
          .select('user:profiles!ticket_watchers_user_id_fkey(id, full_name)')
          .eq('ticket_group_id', ticketData.ticket_group_id);
        setWatchers((watchersData || []).map((w: any) => w.user).filter(Boolean));
      } else {
        setWatchers([]);
      }

      if (ticketData?.supplier_id) fetchSupplierStats(ticketData.supplier_id);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast({ title: 'Error loading ticket', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEscalateToWatcher = async (watcherId: string) => {
    await supabase.from('tickets').update({ assigned_to: watcherId }).eq('id', ticketId);
    toast({ title: 'Ticket assigned to watcher' });
    fetchTicketData(); onRefresh?.();
  };

  const fetchSupplierStats = async (supplierId: string) => {
    try {
      const { data } = await supabase.from('tickets').select('status, created_at, resolved_at').eq('supplier_id', supplierId);
      if (!data) return;
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const firstDate = data.length > 0
        ? new Date(Math.min(...data.map(t => new Date(t.created_at).getTime()))) : now;
      const daysSince = Math.max(1, Math.ceil((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
      setSupplierStats({
        total: data.length,
        active: data.filter(t => !['resolved', 'closed'].includes(t.status)).length,
        resolved: data.filter(t => t.status === 'resolved' || t.status === 'closed').length,
        avgPerDay: parseFloat((data.length / daysSince).toFixed(1)),
        last7Days: data.filter(t => new Date(t.created_at) >= sevenDaysAgo).length,
        last30Days: data.filter(t => new Date(t.created_at) >= thirtyDaysAgo).length,
      });
      setAllSupplierTickets(data);
    } catch (error) { console.error('Error fetching supplier stats:', error); }
  };

  const loadAllSupplierTickets = async () => {
    if (!ticket?.supplier_id) return;
    const { data } = await supabase.from('tickets')
      .select('id, ticket_number, subject, status, created_at')
      .eq('supplier_id', ticket.supplier_id)
      .order('created_at', { ascending: false });
    setAllSupplierTickets(data || []);
    setShowAllTicketsModal(true);
  };

  const uploadAttachments = async (files: File[], tId: string, commentId?: string): Promise<Attachment[]> => {
    const uploaded: Attachment[] = [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return uploaded;
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${tId}/${commentId ? `comments/${commentId}/` : ''}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('ticket-attachments').upload(path, file);
      if (uploadError) continue;
      const { data: { publicUrl } } = supabase.storage.from('ticket-attachments').getPublicUrl(path);
      const { data: attachmentData, error: dbError } = await supabase.from('attachments').insert({
        ticket_id: tId, comment_id: commentId || null, file_name: file.name,
        file_url: publicUrl, file_size: file.size, mime_type: file.type, uploaded_by: user.id
      }).select().single();
      if (!dbError && attachmentData) uploaded.push(attachmentData);
    }
    return uploaded;
  };

  const handleAddComment = async () => {
    if (!newComment.trim() && uploadFiles.length === 0) return;
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.from('comments').insert({
        ticket_id: ticketId, user_id: user.id, content: newComment,
        is_internal: isInternal, comment_source: 'agent'
      }).select('*, user:profiles(full_name)').single();
      if (error) throw error;
      if (uploadFiles.length > 0) await uploadAttachments(uploadFiles, ticketId!, data.id);
      await supabase.from('tickets').update({
        needs_response: false,
        latest_comment_preview: newComment.slice(0, 100),
        ...(ticket?.status === 'new' ? { status: 'in_progress' } : {}),
      }).eq('id', ticketId);
      toast({ title: isInternal ? 'Internal note added' : 'Reply sent' });
      setNewComment('');
      setUploadFiles([]);
      setCannedQuery(null);
      fetchTicketData();
      onRefresh?.();
    } catch (error) {
      toast({ title: 'Error adding comment', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Wire ref AFTER handleAddComment is declared
  addCommentRef.current = handleAddComment;

  const handleResolve = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('tickets').update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user?.id }).eq('id', ticketId);
      toast({ title: 'Ticket Resolved' });
      fetchTicketData(); onRefresh?.();
    } catch { toast({ title: 'Error resolving ticket', variant: 'destructive' }); }
  };

  const handleReassign = async () => {
    try {
      await supabase.from('tickets').update({ assigned_to: selectedUser }).eq('id', ticketId);
      toast({ title: 'Ticket Reassigned' });
      setReassignDialogOpen(false);
      fetchTicketData(); onRefresh?.();
    } catch { toast({ title: 'Error reassigning ticket', variant: 'destructive' }); }
  };

  const handleEscalate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('tickets').update({ is_escalated: true, escalated_at: new Date().toISOString() }).eq('id', ticketId);
      if (escalationNote.trim()) {
        await supabase.from('comments').insert({ ticket_id: ticketId, user_id: user?.id, content: `[ESCALATED] ${escalationNote}`, is_internal: true, comment_source: 'agent' });
      }
      toast({ title: 'Ticket Escalated' });
      setEscalateDialogOpen(false); setEscalationNote('');
      fetchTicketData(); onRefresh?.();
    } catch { toast({ title: 'Error escalating ticket', variant: 'destructive' }); }
  };

  const handleViewAttachment = (attachment: Attachment) => {
    const type = getFileType(attachment.mime_type, attachment.file_name);
    if (type === 'other') { window.open(attachment.file_url, '_blank'); return; }
    setMediaViewer({ open: true, url: attachment.file_url, type: type as any, name: attachment.file_name });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) { e.preventDefault(); setUploadFiles(prev => [...prev, blob]); toast({ title: 'Screenshot pasted!' }); return; }
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!' });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Ticket not found</p>
      </div>
    );
  }

  const isManager = currentUser?.region_id === ticket.region_id;
  const canReply = true;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Media Viewer */}
      {mediaViewer.open && (
        <MediaViewer url={mediaViewer.url} type={mediaViewer.type} name={mediaViewer.name} onClose={() => setMediaViewer(p => ({ ...p, open: false }))} />
      )}

      {/* ── Center: Conversation ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-border">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background flex-shrink-0">
          <div className="flex items-center gap-3">
            {embedded && onClose && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
            <h2 className="text-base font-bold text-foreground">{ticket.ticket_number}</h2>
            <Badge variant="outline" className="text-xs">{ticket.issue_type?.icon} {ticket.issue_type?.name}</Badge>
            {ticket.is_escalated && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                <ArrowUpRight className="w-3 h-3 mr-1" /> Escalated
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="text-xs text-primary h-7" onClick={loadAllSupplierTickets}>
              All Tickets ({supplierStats?.total ?? 0})
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {ticket.sla_due_at && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
              <SLATimer remaining={ticket.sla_due_at} status={(ticket.sla_status as any) || 'on-track'} />
            )}
          </div>
        </div>

        {/* SLA breach warning */}
        {isManager && !ticket.manager_intervened && ticket.sla_status === 'breached' && (
          <div className="mx-4 mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-warning" />
              <p className="text-sm font-medium text-foreground">SLA Breached — Specialist hasn't responded</p>
            </div>
            <Button size="sm" onClick={async () => {
              await supabase.from('tickets').update({ manager_intervened: true, manager_intervened_at: new Date().toISOString() }).eq('id', ticketId);
              setTicket(p => p ? { ...p, manager_intervened: true } : p);
            }}>Intervene</Button>
          </div>
        )}

        {/* ── Chat Thread ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

          {/* Initial ticket description */}
          <div className="bg-secondary/50 border-l-4 border-border rounded-lg p-4">
            <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded mb-2 inline-block">
              New Support Request
            </span>
            {ticket.description && (
              <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{ticket.description}</p>
            )}
            {ticketAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {ticketAttachments.map(att => (
                  <AttachmentPreview key={att.id} attachment={att} onView={handleViewAttachment} />
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </p>
          </div>

          {/* Comments */}
          {comments.map(comment => {
            const attachments = commentAttachments[comment.id] || [];
            const isAgent = comment.comment_source === 'agent';
            const isIntNote = comment.is_internal;

            if (isIntNote) {
              return (
                <div key={comment.id} className="bg-warning/10 border-l-4 border-warning/40 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">🔒</span>
                    <span className="bg-warning/20 text-warning text-xs px-2 py-0.5 rounded-full font-medium">Internal Note</span>
                    <span className="text-sm font-medium text-foreground">{comment.user?.full_name}</span>
                  </div>
                  <p className="text-sm text-foreground italic">{comment.content}</p>
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {attachments.map(att => <AttachmentPreview key={att.id} attachment={att} onView={handleViewAttachment} />)}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </p>
                </div>
              );
            }

            if (isAgent) {
              return (
                <div key={comment.id} className="flex justify-end">
                  <div className="flex items-end gap-2 max-w-[75%]">
                    <div className="bg-primary rounded-2xl rounded-tr-sm px-4 py-3">
                      <p className="text-xs text-primary-foreground/70 mb-1">{comment.user?.full_name}</p>
                      <p className="text-sm text-primary-foreground whitespace-pre-wrap">{comment.content}</p>
                      {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {attachments.map(att => <AttachmentPreview key={att.id} attachment={att} onView={handleViewAttachment} />)}
                        </div>
                      )}
                      <p className="text-xs text-primary-foreground/60 mt-1.5">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground flex-shrink-0 mb-1">
                      {getInitials(comment.user?.full_name)}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={comment.id} className="flex justify-start">
                <div className="flex items-end gap-2 max-w-[75%]">
                  <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-foreground flex-shrink-0 mb-1">
                    {getInitials(ticket.supplier_name)}
                  </div>
                  <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-1">{ticket.supplier_name}</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {attachments.map(att => <AttachmentPreview key={att.id} attachment={att} onView={handleViewAttachment} />)}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Reply Box ────────────────────────────────────────────────────── */}
        {canReply && (
          <div
            className="border-t border-border bg-background flex-shrink-0"
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => {
              e.preventDefault(); setIsDragging(false);
              const files = Array.from(e.dataTransfer?.files || []);
              if (files.length) setUploadFiles(prev => [...prev, ...files]);
            }}
          >
            {isDragging && (
              <div className="absolute inset-0 z-10 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center rounded-lg m-2">
                <p className="text-primary font-medium">Drop files here</p>
              </div>
            )}

            {/* Tabs */}
            <div className="flex px-4 pt-3 gap-4 border-b border-border">
              <button
                onClick={() => setIsInternal(false)}
                className={cn('pb-2 text-sm font-medium transition-colors', !isInternal ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground')}
              >
                <Send className="w-3.5 h-3.5 inline mr-1.5" />Reply
              </button>
              <button
                onClick={() => setIsInternal(true)}
                className={cn('pb-2 text-sm font-medium transition-colors', isInternal ? 'border-b-2 border-warning text-warning' : 'text-muted-foreground hover:text-foreground')}
              >
                <Eye className="w-3.5 h-3.5 inline mr-1.5" />Internal Note
              </button>
            </div>

            <div className="p-3 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                className="hidden"
                onChange={handleFileSelect}
              />
              <FileUploadPreview
                files={uploadFiles}
                onRemove={i => setUploadFiles(prev => prev.filter((_, idx) => idx !== i))}
              />

              <div className="flex items-center gap-2 relative">
                {cannedQuery !== null && (
                  <CannedMessageDropdown
                    query={cannedQuery}
                    onSelect={text => { setNewComment(text); setCannedQuery(null); }}
                    onClose={() => setCannedQuery(null)}
                  />
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-muted-foreground h-8 w-8 flex-shrink-0"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>

                <Textarea
                  placeholder={isInternal ? 'Internal note...' : 'Type message or paste screenshot... (type / for quick replies)'}
                  value={newComment}
                  onChange={e => {
                    const val = e.target.value;
                    setNewComment(val);
                    const slashIndex = val.lastIndexOf('/');
                    if (slashIndex !== -1 && slashIndex === val.length - 1) {
                      setCannedQuery('');
                    } else if (slashIndex !== -1 && !val.slice(slashIndex + 1).includes(' ')) {
                      setCannedQuery(val.slice(slashIndex + 1));
                    } else {
                      setCannedQuery(null);
                    }
                  }}
                  onPaste={handlePaste}
                  rows={1}
                  maxLength={1000}
                  className={cn('resize-none flex-1', isInternal && 'bg-warning/5 border-warning/30')}
                />

                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={(!newComment.trim() && uploadFiles.length === 0) || submitting}
                  className={cn('flex-shrink-0', isInternal ? 'bg-warning hover:bg-warning/90' : '')}
                >
                  {submitting ? '...' : isInternal ? 'Note' : 'Send'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Info Panel ────────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 overflow-y-auto bg-background">

        {/* Contact & Ticket Info */}
        <div className="p-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact & Ticket Info</p>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Business</p>
              <p className="text-sm font-semibold text-foreground">{ticket.supplier_name}</p>
            </div>
            {ticket.supplier_phone && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-foreground">{ticket.supplier_phone}</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(ticket.supplier_phone!)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            {ticket.supplier_address && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Address</p>
                <p className="text-sm text-foreground">{ticket.supplier_address}</p>
              </div>
            )}
            {ticket.supplier_order_count !== undefined && ticket.supplier_order_count !== null && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Order Count</p>
                <p className="text-sm font-semibold text-foreground">{ticket.supplier_order_count}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Ticket #</p>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-foreground">{ticket.ticket_number}</span>
                  <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => copyToClipboard(ticket.ticket_number)}>
                    <Copy className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Created</p>
                <p className="text-xs text-foreground">{format(new Date(ticket.created_at), 'MMM dd, HH:mm')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">City</p>
                <p className="text-xs text-foreground">{ticket.city || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Priority</p>
                <PriorityBadge priority={ticket.priority as any} />
              </div>
            </div>
          </div>
        </div>

        {/* Status Controls */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <Select value={ticket.status} onValueChange={async (val) => {
                await supabase.from('tickets').update({ status: val }).eq('id', ticketId);
                setTicket(p => p ? { ...p, status: val } : p);
                onRefresh?.();
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="new">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Assign to</label>
              <Select value={ticket.assigned_to || 'unassigned'} onValueChange={async (val) => {
                await supabase.from('tickets').update({ assigned_to: val === 'unassigned' ? null : val }).eq('id', ticketId);
                fetchTicketData(); onRefresh?.();
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {ticket.status === 'resolved' || ticket.status === 'closed' ? (
            <Button className="w-full" size="sm" onClick={async () => {
              await supabase.from('tickets').update({ status: 'new' }).eq('id', ticketId);
              fetchTicketData(); onRefresh?.();
            }}>↻ Reopen Ticket</Button>
          ) : (
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white" size="sm" onClick={handleResolve}>
              ✓ Mark Resolved
            </Button>
          )}
        </div>

        {/* Assignment Info */}
        <div className="p-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Assignment</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                {getInitials(ticket.assigned_user?.full_name)}
              </div>
              <span className="text-foreground font-medium">{ticket.assigned_user?.full_name || 'Unassigned'}</span>
            </div>
            {ticket.team?.name && <p className="text-xs text-muted-foreground">Team: {ticket.team.name}</p>}
            {ticket.region?.name && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                {ticket.region.name}
              </Badge>
            )}
            {watchers.length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1.5">Watchers</p>
                <div className="space-y-1.5">
                  {watchers.map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-foreground">
                          {getInitials(w.full_name)}
                        </div>
                        <span className="text-xs text-foreground">{w.full_name}</span>
                      </div>
                      <button onClick={() => handleEscalateToWatcher(w.id)} className="text-xs text-primary hover:underline">
                        Escalate
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Supplier Ticket History */}
        <div className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Supplier Ticket History</p>
          {supplierStats ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 p-3 bg-secondary rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">Avg/Day</p>
                  <p className="text-base font-bold text-foreground">{supplierStats.avgPerDay}</p>
                </div>
                <div className="text-center border-l border-border">
                  <p className="text-xs text-muted-foreground mb-0.5">Last 7d</p>
                  <p className="text-base font-bold text-foreground">{supplierStats.last7Days}</p>
                </div>
                <div className="text-center border-l border-border">
                  <p className="text-xs text-muted-foreground mb-0.5">Last 30d</p>
                  <p className="text-base font-bold text-foreground">{supplierStats.last30Days}</p>
                </div>
              </div>
              <div className="border border-orange-200 rounded-lg p-3 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-semibold text-orange-900 dark:text-orange-400">Active Tickets</h5>
                  <span className="text-lg font-bold text-orange-600">{supplierStats.active}</span>
                </div>
              </div>
              <div
                className="border border-green-200 rounded-lg p-3 bg-green-50 dark:bg-green-950/20 dark:border-green-900 cursor-pointer"
                onClick={() => setShowResolvedBreakdown(p => !p)}
              >
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-semibold text-green-900 dark:text-green-400">Resolved Tickets</h5>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-green-600">{supplierStats.resolved}</span>
                    {showResolvedBreakdown ? <ChevronUp className="h-4 w-4 text-green-700" /> : <ChevronDown className="h-4 w-4 text-green-700" />}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Loading stats...</p>
          )}
        </div>
      </div>

      {/* ── All Supplier Tickets Modal ────────────────────────────────────── */}
      {showAllTicketsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">All Tickets</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{ticket.supplier_name} • {ticket.supplier_phone}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowAllTicketsModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {allSupplierTickets.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No tickets found</p>
              ) : allSupplierTickets.map(t => (
                <div key={t.id} className={cn('p-3 border border-border rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors', t.id === ticketId && 'bg-primary/5 border-primary')}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-primary">{t.ticket_number}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-sm text-foreground truncate">{t.subject}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Reassign Dialog ───────────────────────────────────────────────── */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Ticket</DialogTitle>
            <DialogDescription>Select a team member to reassign this ticket to.</DialogDescription>
          </DialogHeader>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
            <SelectContent className="bg-popover">
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.team?.name || 'No team'})</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReassign} disabled={!selectedUser}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Escalate Dialog ───────────────────────────────────────────────── */}
      <Dialog open={escalateDialogOpen} onOpenChange={setEscalateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalate Ticket</DialogTitle>
            <DialogDescription>Add a note explaining why this ticket is being escalated.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Add escalation note..." rows={3} value={escalationNote} onChange={e => setEscalationNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEscalate}>Escalate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}