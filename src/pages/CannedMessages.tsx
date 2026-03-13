import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Pencil, Trash2, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CannedMessage {
  id: string;
  created_by: string;
  title: string;
  shortcut: string;
  message_text: string;
  created_at: string;
  author?: { full_name: string };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CannedMessages() {
  const [messages, setMessages]     = useState<CannedMessage[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing]       = useState<CannedMessage | null>(null);

  // Form state
  const [title, setTitle]           = useState('');
  const [shortcut, setShortcut]     = useState('');
  const [messageText, setMessageText] = useState('');

  useEffect(() => { fetchMessages(); }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('canned_messages')
        .select('*, author:profiles!canned_messages_created_by_fkey(full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching canned messages:', error);
      toast({ title: 'Error loading messages', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ── Open dialog ────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditing(null);
    setTitle('');
    setShortcut('');
    setMessageText('');
    setShowDialog(true);
  };

  const openEdit = (msg: CannedMessage) => {
    setEditing(msg);
    setTitle(msg.title);
    setShortcut(msg.shortcut || '');
    setMessageText(msg.message_text);
    setShowDialog(true);
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!title.trim() || !messageText.trim()) {
      toast({ title: 'Title and message are required', variant: 'destructive' });
      return;
    }

    // Normalize shortcut: ensure it starts with /
    const normalizedShortcut = shortcut.trim()
      ? shortcut.trim().startsWith('/')
        ? shortcut.trim().toLowerCase()
        : `/${shortcut.trim().toLowerCase()}`
      : '';

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editing) {
        const { error } = await supabase
          .from('canned_messages')
          .update({ title: title.trim(), shortcut: normalizedShortcut, message_text: messageText.trim() })
          .eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Message updated' });
      } else {
        const { error } = await supabase
          .from('canned_messages')
          .insert({ created_by: user.id, title: title.trim(), shortcut: normalizedShortcut, message_text: messageText.trim() });
        if (error) throw error;
        toast({ title: 'Message created' });
      }

      setShowDialog(false);
      fetchMessages();
    } catch (error: any) {
      console.error('Error saving:', error);
      toast({ title: 'Error saving message', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this canned message?')) return;
    try {
      const { error } = await supabase.from('canned_messages').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Message deleted' });
      fetchMessages();
    } catch (error: any) {
      toast({ title: 'Error deleting message', variant: 'destructive' });
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────

  const filtered = messages.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.shortcut?.toLowerCase().includes(search.toLowerCase()) ||
    m.message_text.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Canned Messages</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Quick replies — type <code className="bg-secondary px-1 rounded text-xs">/shortcut</code> in any reply box
          </p>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          New Message
        </Button>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-border flex-shrink-0">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search messages or shortcuts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm bg-card"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground mb-1">
              {search ? 'No messages match your search' : 'No canned messages yet'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {!search && 'Create quick replies to save time when responding to tickets'}
            </p>
            {!search && (
              <Button size="sm" onClick={openAdd}>
                <Plus className="w-4 h-4 mr-1.5" />
                Create First Message
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 max-w-4xl">
            {filtered.map(msg => (
              <div
                key={msg.id}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{msg.title}</h3>
                    {msg.shortcut && (
                      <Badge variant="outline" className="text-xs font-mono bg-primary/5 text-primary border-primary/20 flex-shrink-0">
                        {msg.shortcut}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(msg)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(msg.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed line-clamp-3">
                  {msg.message_text}
                </p>

                <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {msg.author?.full_name || 'Unknown'}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Message' : 'New Canned Message'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update this canned message.' : 'Create a quick reply you can trigger with a shortcut.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Title</label>
              <Input
                placeholder="e.g. Welcome Message, Refund Policy"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Shortcut <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                placeholder="e.g. /aoa, /refund, /delay"
                value={shortcut}
                onChange={e => setShortcut(e.target.value)}
                maxLength={30}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Type this in the reply box to trigger this message
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Message</label>
              <Textarea
                placeholder="Type your canned message here..."
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                rows={6}
                className="resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {messageText.length}/1000
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !title.trim() || !messageText.trim()}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}