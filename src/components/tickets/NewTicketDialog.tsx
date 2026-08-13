import { useState, useEffect, useRef } from 'react';
import { Search, Check, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

// Suppliers store a phone under one of several possible column names; grab whichever exists.
const resolvePhone = (s: any): string | null =>
  s?.supplier_phone || s?.phone || s?.phone_number || s?.contact_number ||
  s?.whatsapp || s?.whatsapp_number || s?.mobile || s?.contact || null;

// Only offer types a supplier could also choose, so outbound tickets group
// alongside inbound ones. Retired types stay out of the list.
const selectableIssueTypes = (types: any[]) =>
  (types || []).filter(t => t?.is_active !== false);

interface NewTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issueTypes: any[];
  onCreated: (ticketId: string) => void;
}

export function NewTicketDialog({ open, onOpenChange, issueTypes, onCreated }: NewTicketDialogProps) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [issueTypeId, setIssueTypeId] = useState('');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Debounced server-side search — scales to the whole supplier catalog
  // (loading all rows would cap at 1000 and miss the rest). Shows the first 20
  // by name when the box is empty, then live-searches as the agent types.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      let query = supabase
        .from('suppliers')
        .select('*')
        .not('is_active', 'is', false)   // include true + null; hide only explicitly deactivated
        .order('business_name')
        .limit(20);
      const q = supplierSearch.trim();
      if (q) query = query.or(`business_name.ilike.%${q}%,supplier_uid.ilike.%${q}%,city.ilike.%${q}%`);
      const { data } = await query;
      setSuppliers(data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [open, supplierSearch]);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setSupplierSearch(''); setSelectedSupplier(null); setMessage(''); setDropOpen(false);
      setIssueTypeId('');
    }
  }, [open]);

  // Close the supplier dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const filtered = suppliers;   // already searched + limited server-side
  const selectableTypes = selectableIssueTypes(issueTypes);

  const createTicket = async () => {
    if (!selectedSupplier || !message.trim() || !issueTypeId) return;
    if (!selectedSupplier.supplier_uid) {
      toast({ title: 'Supplier is missing its UID', description: 'This supplier can\'t receive tickets — the record has no supplier_uid.', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const text = message.trim();
      const subject = (text.split('\n')[0] || 'Outreach').slice(0, 80);

      // 1. Create the ticket for this supplier
      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          // The supplier hub matches a supplier's tickets on supplier_id == supplier_uid
          // (the UID string), NOT the suppliers-table UUID. supplier_table_id holds the UUID.
          supplier_id: selectedSupplier.supplier_uid,
          supplier_table_id: selectedSupplier.id,
          supplier_name: selectedSupplier.business_name,
          supplier_phone: resolvePhone(selectedSupplier),
          city: selectedSupplier.city,
          issue_type_id: issueTypeId,
          subject,
          description: text,
          latest_comment_preview: text.slice(0, 100),
          priority: 'normal',
          status: 'in_progress',
          needs_response: false,       // we sent the first message; supplier owes the reply
          created_by: user.id,
        })
        .select('id')
        .single();
      if (error) throw error;

      // 2. The intake trigger forces assigned_to = NULL on insert; assign to me.
      await supabase
        .from('tickets')
        .update({ assigned_to: user.id, assigned_at: new Date().toISOString() })
        .eq('id', ticket.id);

      // 3. Seed the first agent message (delivered to the supplier by the backend bridge).
      await supabase.from('comments').insert({
        ticket_id: ticket.id,
        user_id: user.id,
        content: text,
        is_internal: false,
        comment_source: 'agent',
      });

      toast({ title: 'Ticket opened', description: `Message sent to ${selectedSupplier.business_name}` });
      onCreated(ticket.id);
    } catch (e: any) {
      toast({ title: 'Could not open ticket', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Open a ticket with a supplier</DialogTitle>
          <DialogDescription>
            Start a conversation. Your message is sent to the supplier and the ticket lands in your open tickets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Supplier picker */}
          <div ref={dropRef} className="relative">
            <label className="text-sm font-medium text-foreground">Supplier</label>
            {selectedSupplier ? (
              <div className="mt-1.5 flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{selectedSupplier.business_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedSupplier.city}{selectedSupplier.supplier_uid ? ` · ${selectedSupplier.supplier_uid}` : ''}
                    {resolvePhone(selectedSupplier) ? ` · ${resolvePhone(selectedSupplier)}` : ''}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"
                  onClick={() => { setSelectedSupplier(null); setSupplierSearch(''); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="mt-1.5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search by business, ID, or city…"
                    className="pl-9"
                    value={supplierSearch}
                    onChange={e => { setSupplierSearch(e.target.value); setDropOpen(true); }}
                    onFocus={() => setDropOpen(true)}
                  />
                </div>
                {dropOpen && (
                  <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
                    {filtered.length === 0 ? (
                      <p className="px-3 py-2.5 text-sm text-muted-foreground">No suppliers found</p>
                    ) : filtered.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setSelectedSupplier(s); setDropOpen(false); }}
                        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-secondary transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{s.business_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {s.city}{s.supplier_uid ? ` · ${s.supplier_uid}` : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Issue type — chosen by the agent, mirroring what a supplier picks */}
          <div>
            <label className="text-sm font-medium text-foreground">Issue type</label>
            <Select value={issueTypeId} onValueChange={setIssueTypeId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select an issue type…" />
              </SelectTrigger>
              <SelectContent>
                {selectableTypes.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No active issue types
                  </div>
                ) : selectableTypes.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.icon ? `${t.icon} ` : ''}{t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* First message */}
          <div>
            <label className="text-sm font-medium text-foreground">Message</label>
            <Textarea
              className="mt-1.5"
              rows={5}
              placeholder="Type your message to the supplier…"
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>Cancel</Button>
          <Button onClick={createTicket} disabled={!selectedSupplier || !issueTypeId || !message.trim() || creating} className="gap-1.5">
            {creating ? <Check className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
            {creating ? 'Sending…' : 'Send & open ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
