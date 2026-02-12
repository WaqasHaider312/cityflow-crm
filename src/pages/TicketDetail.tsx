import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ArrowUpRight, Users, X, Eye, Send, AlertCircle, Paperclip, Download, FileText, Image, Film, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { SLATimer } from '@/components/common/SLATimer';
import { Badge } from '@/components/ui/badge';
import { MediaViewer } from '@/components/common/MediaViewer';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
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

interface MediaViewerState {
  open: boolean;
  url: string;
  type: 'image' | 'video' | 'pdf';
  name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileType(mimeType?: string, fileName?: string): 'image' | 'video' | 'pdf' | 'other' {
  if (!mimeType && !fileName) return 'other';
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

// ─── AttachmentPreview ────────────────────────────────────────────────────────

function AttachmentPreview({
  attachment,
  onView,
}: {
  attachment: Attachment;
  onView: (a: Attachment) => void;
}) {
  const type = getFileType(attachment.mime_type, attachment.file_name);

  if (type === 'image') {
    return (
      <button
        onClick={() => onView(attachment)}
        className="relative group rounded-lg overflow-hidden border border-border w-20 h-20 flex-shrink-0 hover:ring-2 hover:ring-primary transition-all"
      >
        <img
          src={attachment.file_url}
          alt={attachment.file_name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Eye className="w-5 h-5 text-white" />
        </div>
      </button>
    );
  }

  if (type === 'video') {
    return (
      <button
        onClick={() => onView(attachment)}
        className="relative group rounded-lg overflow-hidden border border-border w-20 h-20 flex-shrink-0 bg-secondary hover:ring-2 hover:ring-primary transition-all flex items-center justify-center"
      >
        <Film className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
        <div className="absolute bottom-1 left-1 right-1">
          <p className="text-xs text-muted-foreground truncate text-center">{attachment.file_name}</p>
        </div>
      </button>
    );
  }

  if (type === 'pdf') {
    return (
      <button
        onClick={() => onView(attachment)}
        className="relative group rounded-lg overflow-hidden border border-border w-20 h-20 flex-shrink-0 bg-secondary hover:ring-2 hover:ring-primary transition-all flex flex-col items-center justify-center gap-1 p-2"
      >
        <FileText className="w-8 h-8 text-red-400 group-hover:text-red-500 transition-colors" />
        <p className="text-xs text-muted-foreground truncate w-full text-center">{attachment.file_name}</p>
      </button>
    );
  }

  // Generic file
  return (
    <a
      href={attachment.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-colors text-sm"
    >
      <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-foreground truncate max-w-[120px]">{attachment.file_name}</p>
        {attachment.file_size && (
          <p className="text-xs text-muted-foreground">{formatFileSize(attachment.file_size)}</p>
        )}
      </div>
      <Download className="w-3 h-3 text-muted-foreground flex-shrink-0" />
    </a>
  );
}

// ─── MediaViewer (extended to support PDF) ───────────────────────────────────

function MediaViewerExtended({ url, type, name, onClose }: {
  url: string;
  type: 'image' | 'video' | 'pdf';
  name: string;
  onClose: () => void;
}) {
  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* Top bar */}
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

      {/* Content */}
      <div
        className="flex-1 flex items-center justify-center p-4 overflow-hidden"
        onClick={onClose}
      >
        {type === 'image' && (
          <img
            src={url}
            alt={name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        )}
        {type === 'video' && (
          <video
            src={url}
            controls
            autoPlay
            playsInline
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            style={{ maxHeight: 'calc(100vh - 80px)' }}
            onClick={e => e.stopPropagation()}
          />
        )}
        {type === 'pdf' && (
          <div
            className="w-full h-full flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <iframe
              src={url}
              className="w-full rounded-lg shadow-2xl bg-white"
              style={{ height: 'calc(100vh - 100px)', maxWidth: '900px' }}
              title={name}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FileUploadPreview ────────────────────────────────────────────────────────

function FileUploadPreview({ files, onRemove }: { files: File[]; onRemove: (i: number) => void }) {
  if (files.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {files.map((file, i) => {
        const type = getFileType(file.type, file.name);
        const previewUrl = type === 'image' ? URL.createObjectURL(file) : null;
        return (
          <div key={i} className="relative group">
            {previewUrl ? (
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-border">
                <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-secondary border border-border text-xs">
                {type === 'pdf' ? <FileText className="w-3 h-3 text-red-400" /> : <File className="w-3 h-3 text-muted-foreground" />}
                <span className="max-w-[80px] truncate text-foreground">{file.name}</span>
              </div>
            )}
            <button
              onClick={() => onRemove(i)}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentAttachments, setCommentAttachments] = useState<Record<string, Attachment[]>>({});
  const [ticketAttachments, setTicketAttachments] = useState<Attachment[]>([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const [mediaViewer, setMediaViewer] = useState<MediaViewerState>({ open: false, url: '', type: 'image', name: '' });
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [escalationNote, setEscalationNote] = useState('');

  useEffect(() => { fetchTicketData(); }, [id]);

  const fetchTicketData = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, region:regions(id, name)')
        .eq('id', user.id)
        .single();
      setCurrentUser(profile);

      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          issue_type:issue_types(name, icon),
          assigned_user:profiles!assigned_to(id, full_name),
          team:teams!tickets_team_id_fkey(name),
          tier2_team:teams!tier2_team_id(name),
          region:regions(id, name, manager:profiles!regions_manager_id_fkey(full_name)),
          watchers:ticket_watchers(user:profiles(full_name))
        `)
        .eq('id', id)
        .single();
      if (ticketError) throw ticketError;

      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*, user:profiles(full_name)')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });
      if (commentsError) throw commentsError;

      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, team:teams!fk_team(name)')
        .eq('is_active', true)
        .order('full_name');
      if (usersError) throw usersError;

      // Fetch ticket-level attachments
      const { data: ticketAttachmentsData } = await supabase
        .from('attachments')
        .select('*')
        .eq('ticket_id', id)
        .is('comment_id', null);

      // Fetch comment attachments
      const commentIds = (commentsData || []).map(c => c.id);
      let commentAttachmentsMap: Record<string, Attachment[]> = {};
      if (commentIds.length > 0) {
        const { data: commentAttachmentsData } = await supabase
          .from('attachments')
          .select('*')
          .in('comment_id', commentIds);

        (commentAttachmentsData || []).forEach((att: Attachment) => {
          if (!commentAttachmentsMap[att.comment_id!]) {
            commentAttachmentsMap[att.comment_id!] = [];
          }
          commentAttachmentsMap[att.comment_id!].push(att);
        });
      }

      setTicket(ticketData);
      setComments(commentsData || []);
      setUsers(usersData || []);
      setTicketAttachments(ticketAttachmentsData || []);
      setCommentAttachments(commentAttachmentsMap);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast({ title: "Error loading ticket", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatSLARemaining = () => {
    if (!ticket?.sla_due_at) return '0h';
    const now = new Date();
    const dueAt = new Date(ticket.sla_due_at);
    const timeRemaining = dueAt.getTime() - now.getTime();
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    if (timeRemaining < 0) return `-${Math.abs(hoursRemaining)}h`;
    return `${hoursRemaining}h ${minutesRemaining}m`;
  };

  const uploadAttachments = async (files: File[], ticketId: string, commentId?: string): Promise<Attachment[]> => {
    const uploaded: Attachment[] = [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return uploaded;

    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${ticketId}/${commentId ? `comments/${commentId}/` : ''}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(path, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(path);

      const { data: attachmentData, error: dbError } = await supabase
        .from('attachments')
        .insert({
          ticket_id: ticketId,
          comment_id: commentId || null,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id
        })
        .select()
        .single();

      if (!dbError && attachmentData) {
        uploaded.push(attachmentData);
      }
    }
    return uploaded;
  };

  const handleAddComment = async () => {
    if (!newComment.trim() && uploadFiles.length === 0) return;

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          ticket_id: id,
          user_id: user.id,
          content: newComment,
          is_internal: isInternal
        })
        .select('*, user:profiles(full_name)')
        .single();

      if (error) throw error;

      // Upload files if any
      if (uploadFiles.length > 0) {
        await uploadAttachments(uploadFiles, id!, data.id);
      }

      toast({ title: isInternal ? "Internal note added" : "Reply sent" });
      setNewComment('');
      setUploadFiles([]);
      fetchTicketData();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({ title: "Error adding comment", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleViewAttachment = (attachment: Attachment) => {
    const type = getFileType(attachment.mime_type, attachment.file_name);
    if (type === 'other') {
      window.open(attachment.file_url, '_blank');
      return;
    }
    setMediaViewer({ open: true, url: attachment.file_url, type: type as 'image' | 'video' | 'pdf', name: attachment.file_name });
  };

  const handleIntervene = async () => {
    try {
      const { error } = await supabase.from('tickets').update({ manager_intervened: true, manager_intervened_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      toast({ title: "Intervention Marked" });
      setTicket({ ...ticket, manager_intervened: true });
    } catch (error) {
      toast({ title: "Error marking intervention", variant: "destructive" });
    }
  };

  const handleResolve = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('tickets').update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user.id }).eq('id', id);
      if (error) throw error;
      toast({ title: "Ticket Resolved" });
      fetchTicketData();
    } catch (error) {
      toast({ title: "Error resolving ticket", variant: "destructive" });
    }
  };

  const handleReassign = async () => {
    try {
      const { error } = await supabase.from('tickets').update({ assigned_to: selectedUser }).eq('id', id);
      if (error) throw error;
      toast({ title: "Ticket Reassigned" });
      setReassignDialogOpen(false);
      fetchTicketData();
    } catch (error) {
      toast({ title: "Error reassigning ticket", variant: "destructive" });
    }
  };

  const handleEscalate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('tickets').update({ is_escalated: true, escalated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      if (escalationNote.trim()) {
        await supabase.from('comments').insert({ ticket_id: id, user_id: user.id, content: `[ESCALATED] ${escalationNote}`, is_internal: true });
      }
      toast({ title: "Ticket Escalated" });
      setEscalateDialogOpen(false);
      setEscalationNote('');
      fetchTicketData();
    } catch (error) {
      toast({ title: "Error escalating ticket", variant: "destructive" });
    }
  };

  const handleClose = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('tickets').update({ status: 'closed', closed_at: new Date().toISOString(), closed_by: user.id }).eq('id', id);
      if (error) throw error;
      toast({ title: "Ticket Closed" });
      fetchTicketData();
    } catch (error) {
      toast({ title: "Error closing ticket", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Ticket not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/tickets')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Tickets
        </Button>
      </div>
    );
  }

  const slaRemaining = formatSLARemaining();
  const watchers = ticket.watchers?.map(w => w.user.full_name) || [];
  const isCityManager = currentUser?.region_id === ticket.region_id;
  const isAssignedSpecialist = currentUser?.id === ticket.assigned_to;
  const canReply = isAssignedSpecialist || isCityManager;

  return (
    <div className="space-y-6">
      {/* Media Viewer */}
      {mediaViewer.open && (
        <MediaViewerExtended
          url={mediaViewer.url}
          type={mediaViewer.type}
          name={mediaViewer.name}
          onClose={() => setMediaViewer(prev => ({ ...prev, open: false }))}
        />
      )}

      <Button variant="ghost" onClick={() => navigate('/tickets')}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Tickets
      </Button>

      {/* Ticket Header */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">#{ticket.ticket_number}</span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {ticket.manager_intervened && (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                  <AlertCircle className="w-3 h-3 mr-1" /> Manager Involved
                </Badge>
              )}
              {ticket.is_escalated && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                  <ArrowUpRight className="w-3 h-3 mr-1" /> Escalated
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold text-foreground">{ticket.subject}</h1>
          </div>
          {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <SLATimer remaining={slaRemaining} status={ticket.sla_status} />
          )}
        </div>

        {isCityManager && !ticket.manager_intervened && ticket.sla_status === 'breached' && (
          <div className="mt-4 p-4 bg-warning/10 border border-warning/20 rounded-lg flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium text-foreground">SLA Breached - Intervention Needed</p>
                <p className="text-sm text-muted-foreground mt-1">Specialist hasn't responded within SLA. Would you like to intervene?</p>
              </div>
            </div>
            <Button size="sm" onClick={handleIntervene}>Intervene</Button>
          </div>
        )}

        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border">
          <Button onClick={handleResolve} disabled={ticket.status === 'resolved' || ticket.status === 'closed'}>
            <CheckCircle2 className="w-4 h-4 mr-2" /> Resolve
          </Button>
          <Button variant="outline" onClick={() => setEscalateDialogOpen(true)} disabled={ticket.is_escalated}>
            <ArrowUpRight className="w-4 h-4 mr-2" /> Escalate
          </Button>
          <Button variant="outline" onClick={() => setReassignDialogOpen(true)}>
            <Users className="w-4 h-4 mr-2" /> Reassign
          </Button>
          <Button variant="outline" onClick={handleClose} disabled={ticket.status === 'closed'}>
            <X className="w-4 h-4 mr-2" /> Close
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel */}
        <div className="space-y-6">
          <div className="bg-card rounded-lg border border-border p-5 space-y-4">
            <h3 className="font-semibold text-foreground">Ticket Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issue Type</span>
                <span className="font-medium text-foreground">{ticket.issue_type?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supplier</span>
                <span className="font-medium text-foreground">{ticket.supplier_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">City</span>
                <span className="font-medium text-foreground">{ticket.supplier_city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Region</span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {ticket.region?.name || 'Unknown'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground">{new Date(ticket.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-5 space-y-4">
            <h3 className="font-semibold text-foreground">Assignment</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground block mb-2">Tier 1 (Specialist)</span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {ticket.assigned_user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                  </div>
                  <span className="font-medium text-foreground">{ticket.assigned_user?.full_name || 'Unassigned'}</span>
                </div>
                {ticket.team?.name && <p className="text-xs text-muted-foreground mt-1">Team: {ticket.team.name}</p>}
              </div>
              <div>
                <span className="text-muted-foreground block mb-2">Tier 2 (Escalation)</span>
                <p className="text-foreground">{ticket.tier2_team?.name || 'No escalation team'}</p>
                {ticket.region?.manager?.full_name && (
                  <p className="text-xs text-muted-foreground mt-1">Manager: {ticket.region.manager.full_name}</p>
                )}
              </div>
              {watchers.length > 0 && (
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">Watchers</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {watchers.map((watcher, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-secondary rounded-full">{watcher}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-5 space-y-4">
            <h3 className="font-semibold text-foreground">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{ticket.description}</p>
          </div>

          {/* Ticket-level attachments */}
          {ticketAttachments.length > 0 && (
            <div className="bg-card rounded-lg border border-border p-5 space-y-4">
              <h3 className="font-semibold text-foreground">Attachments</h3>
              <div className="flex flex-wrap gap-2">
                {ticketAttachments.map(att => (
                  <AttachmentPreview key={att.id} attachment={att} onView={handleViewAttachment} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right - Communication Thread */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-lg border border-border flex flex-col">
            <div className="p-4 border-b border-border flex-shrink-0">
              <h3 className="font-semibold text-foreground">Communication</h3>
              {canReply && (
                <p className="text-xs text-muted-foreground mt-1">
                  {isCityManager && !isAssignedSpecialist && 'You can respond as City Manager'}
                  {isAssignedSpecialist && !isCityManager && 'You are the assigned specialist'}
                  {isAssignedSpecialist && isCityManager && 'You are both specialist and city manager'}
                </p>
              )}
            </div>

            {/* Comments */}
            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto scrollbar-thin">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No comments yet. Start the conversation below.
                </p>
              ) : (
                comments.map((comment) => {
                  const attachments = commentAttachments[comment.id] || [];
                  return (
                    <div
                      key={comment.id}
                      className={`p-4 rounded-lg ${comment.is_internal ? 'bg-warning/10 border border-warning/20' : 'bg-secondary'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                            {comment.user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <span className="font-medium text-sm text-foreground">{comment.user.full_name}</span>
                          {comment.is_internal && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning">Internal</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>

                      {comment.content && (
                        <p className="text-sm text-foreground">{comment.content}</p>
                      )}

                      {/* Comment attachments */}
                      {attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {attachments.map(att => (
                            <AttachmentPreview key={att.id} attachment={att} onView={handleViewAttachment} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Input */}
            {canReply && (
              <div className="p-4 border-t border-border space-y-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Button
                    variant={isInternal ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => setIsInternal(false)}
                  >
                    <Send className="w-4 h-4 mr-1" /> Reply
                  </Button>
                  <Button
                    variant={isInternal ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsInternal(true)}
                    className={isInternal ? 'bg-warning hover:bg-warning/90' : ''}
                  >
                    <Eye className="w-4 h-4 mr-1" /> Internal Note
                  </Button>
                </div>

                <Textarea
                  placeholder={isInternal ? 'Add internal note (only visible to team)...' : 'Reply to supplier...'}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />

                {/* File upload previews */}
                <FileUploadPreview
                  files={uploadFiles}
                  onRemove={(i) => setUploadFiles(prev => prev.filter((_, idx) => idx !== i))}
                />

                <div className="flex items-center justify-between">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Paperclip className="w-4 h-4 mr-1.5" />
                      Attach files
                    </Button>
                  </div>
                  <Button
                    onClick={handleAddComment}
                    disabled={(!newComment.trim() && uploadFiles.length === 0) || submitting}
                  >
                    {submitting ? 'Sending...' : isInternal ? 'Add Note' : 'Send Reply'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reassign Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Ticket</DialogTitle>
            <DialogDescription>Select a team member to reassign this ticket to.</DialogDescription>
          </DialogHeader>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger>
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name} ({user.team?.name || 'No team'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReassign} disabled={!selectedUser}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escalate Dialog */}
      <Dialog open={escalateDialogOpen} onOpenChange={setEscalateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalate Ticket</DialogTitle>
            <DialogDescription>Add a note explaining why this ticket is being escalated.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Add escalation note..."
            rows={3}
            value={escalationNote}
            onChange={(e) => setEscalationNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEscalate}>Escalate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}