import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Pencil, Shield, Ban, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

export default function UserManagement() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState('');
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          *,
          team:teams!fk_team(id, name)
        `)
        .order('full_name');

      if (usersError) throw usersError;

      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (teamsError) throw teamsError;

      setUsers(usersData || []);
      setTeams(teamsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Error loading users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.team?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const roleDisplay = {
    'super_admin': 'Super Admin',
    'team_admin': 'Team Admin',
    'member': 'Team Member',
  };

  const roleColors = {
    'super_admin': 'bg-danger/15 text-danger',
    'team_admin': 'bg-info/15 text-info',
    'member': 'bg-muted text-muted-foreground',
  };

  const handleCreateUser = async () => {
  if (!fullName || !email || !selectedTeam || !selectedRole) {
    toast({ title: "Please fill all fields", variant: "destructive" });
    return;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: crypto.randomUUID(),
        email,
        full_name: fullName,
        team_id: selectedTeam,
        role: selectedRole,
        is_active: true
      });

    if (error) throw error;

    toast({ 
      title: "Profile Created", 
      description: "Create auth user in Supabase dashboard" 
    });
    
    setAddUserDialogOpen(false);
    setFullName('');
    setEmail('');
    setSelectedTeam('');
    setSelectedRole('');
    fetchData();
  } catch (error) {
    console.error('Error creating user:', error);
    toast({ title: "Error creating user", variant: "destructive" });
  }
};

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast({ title: "Role Updated" });
      fetchData(); // Refresh
    } catch (error) {
      console.error('Error updating role:', error);
      toast({ title: "Error updating role", variant: "destructive" });
    }
  };

  const handleDeactivate = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', userId);

      if (error) throw error;

      toast({ title: "User Deactivated" });
      fetchData(); // Refresh
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast({ title: "Error deactivating user", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">Loading...</p>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage users and their roles</p>
        </div>
        <Button onClick={() => setAddUserDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card"
        />
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                        </span>
                      </div>
                      <span className="font-medium text-foreground">{user.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>{user.team?.name || 'No team'}</TableCell>
                  <TableCell>
                    <Badge className={roleColors[user.role]} variant="secondary">
                      {user.role === 'super_admin' && <Shield className="w-3 h-3 mr-1" />}
                      {roleDisplay[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={user.is_active 
                        ? "bg-success/10 text-success border-success/20" 
                        : "bg-muted text-muted-foreground"}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          // Cycle through roles for demo
                          const roles = ['member', 'team_admin', 'super_admin'];
                          const currentIndex = roles.indexOf(user.role);
                          const nextRole = roles[(currentIndex + 1) % roles.length];
                          handleUpdateRole(user.id, nextRole);
                        }}>
                          <Shield className="w-4 h-4 mr-2" />
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-danger"
                          onClick={() => handleDeactivate(user.id)}
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Create a new user account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                placeholder="Enter full name" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email" 
                placeholder="email@cityteam.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="member">Team Member</SelectItem>
                  <SelectItem value="team_admin">Team Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser}>
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
