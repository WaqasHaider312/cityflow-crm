import { useState, useEffect } from 'react';
import { Plus, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const ROLES = [
  { value: 'member',      label: 'Member' },
  { value: 'team_admin',  label: 'Team Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];
const roleLabel = (r: string) => ROLES.find(x => x.value === r)?.label ?? r;
const roleColor: Record<string, string> = {
  super_admin: 'bg-destructive/10 text-destructive',
  team_admin:  'bg-primary/10 text-primary',
  member:      'bg-muted text-muted-foreground',
};

export default function UserManagement() {
  const [loading, setLoading]         = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers]             = useState<any[]>([]);
  const [teams, setTeams]             = useState<any[]>([]);
  const [regions, setRegions]         = useState<any[]>([]);
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [saving, setSaving]           = useState(false);

  // form
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('member');
  const [teamId, setTeamId]     = useState('');
  const [regionId, setRegionId] = useState('');

  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.is_super_admin === true;

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let me: any = null;
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        me = data;
      }
      setCurrentUser(me);
      if (me?.role === 'super_admin' || me?.is_super_admin) await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    const [{ data: usersData }, { data: teamsData }, { data: regionsData }] = await Promise.all([
      supabase.from('profiles')
        .select('id, full_name, email, role, is_active, team:teams!fk_team(name), region:regions!profiles_region_id_fkey(name)')
        .order('full_name'),
      supabase.from('teams').select('id, name').eq('is_active', true).order('name'),
      supabase.from('regions').select('id, name').order('name'),
    ]);
    setUsers(usersData || []);
    setTeams(teamsData || []);
    setRegions(regionsData || []);
  };

  const resetForm = () => {
    setFullName(''); setEmail(''); setPassword(''); setRole('member'); setTeamId(''); setRegionId('');
  };

  const handleCreate = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast({ title: 'Name, email and password are required', variant: 'destructive' }); return;
    }
    if (password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' }); return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-crm-user', {
        body: {
          full_name: fullName.trim(),
          email:     email.trim(),
          password,
          role,
          team_id:   teamId   || null,
          region_id: regionId || null,
        },
      });
      // supabase-js reports non-2xx as `error` with the real body on error.context
      if (error) {
        let msg = error.message || 'Request failed';
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const b = await ctx.json();
            if (b?.error) msg = b.error;
          }
        } catch { /* keep msg */ }
        throw new Error(msg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);

      toast({ title: 'User created', description: `${fullName.trim()} can now sign in with their email.` });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (e: any) {
      toast({ title: 'Could not create user', description: e.message || 'Please try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <ShieldAlert className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Super admins only</h1>
        <p className="mt-1 text-sm text-muted-foreground">You don't have permission to manage users.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Add CRM team members and set their access.</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No users yet</TableCell></TableRow>
            ) : users.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium text-foreground">{u.full_name || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge className={cn('border-0 font-medium', roleColor[u.role] || 'bg-muted text-muted-foreground')}>
                    {roleLabel(u.role)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.team?.name || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{u.region?.name || '—'}</TableCell>
                <TableCell>
                  <span className={cn('text-xs font-medium', u.is_active ? 'text-status-resolved' : 'text-muted-foreground')}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add User dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a CRM user</DialogTitle>
            <DialogDescription>They'll sign in with the email and password you set here.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Ayesha Khan" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@markaz.app" />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" />
              <p className="text-xs text-muted-foreground">Share this with them; they can change it later.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Team</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Region {role !== 'member' && <span className="text-muted-foreground font-normal">(scopes what they see)</span>}</Label>
              <Select value={regionId} onValueChange={setRegionId}>
                <SelectTrigger><SelectValue placeholder="Optional — leave empty for all regions" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {regions.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="gap-1.5">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : 'Create user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
