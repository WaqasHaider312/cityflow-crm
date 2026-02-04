import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, MapPin, User } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

export default function RegionsManagement() {
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState([]);
  const [users, setUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState(null);
  
  // Form state
  const [regionName, setRegionName] = useState('');
  const [managerId, setManagerId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch regions
      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select(`
          *,
          manager:profiles!regions_manager_id_fkey(id, full_name, email)
        `)
        .order('name');

      if (regionsError) throw regionsError;

      // Fetch users who can be city managers (admins)
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('is_active', true)
        .in('role', ['admin', 'super_admin'])
        .order('full_name');

      if (usersError) throw usersError;

      setRegions(regionsData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Error loading regions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (region = null) => {
    if (region) {
      setEditingRegion(region);
      setRegionName(region.name);
      setManagerId(region.manager_id || '');
    } else {
      setEditingRegion(null);
      setRegionName('');
      setManagerId('');
    }
    setDialogOpen(true);
  };

  const handleSaveRegion = async () => {
    if (!regionName.trim()) {
      toast({ title: "Region name is required", variant: "destructive" });
      return;
    }

    try {
      if (editingRegion) {
        // Update existing region
        const { error } = await supabase
          .from('regions')
          .update({
            name: regionName,
            manager_id: managerId || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingRegion.id);

        if (error) throw error;

        // Update manager's region_id in profiles
        if (managerId) {
          await supabase
            .from('profiles')
            .update({ region_id: editingRegion.id })
            .eq('id', managerId);
        }

        toast({ title: "Region Updated" });
      } else {
        // Create new region
        const { data: newRegion, error } = await supabase
          .from('regions')
          .insert({
            name: regionName,
            manager_id: managerId || null
          })
          .select()
          .single();

        if (error) throw error;

        // Update manager's region_id in profiles
        if (managerId) {
          await supabase
            .from('profiles')
            .update({ region_id: newRegion.id })
            .eq('id', managerId);
        }

        toast({ title: "Region Created" });
      }

      setDialogOpen(false);
      setRegionName('');
      setManagerId('');
      setEditingRegion(null);
      fetchData();
    } catch (error) {
      console.error('Error saving region:', error);
      toast({ title: "Error saving region", variant: "destructive" });
    }
  };

  const handleDeleteRegion = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will affect city mappings.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('regions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Region Deleted" });
      fetchData();
    } catch (error) {
      console.error('Error deleting region:', error);
      toast({ 
        title: "Error deleting region", 
        description: "Make sure no cities are mapped to this region first.",
        variant: "destructive" 
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Regions Management</h1>
          <p className="text-muted-foreground mt-1">Loading...</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <p className="text-muted-foreground">Loading regions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Regions Management</h1>
          <p className="text-muted-foreground mt-1">
            Create regions and assign city managers
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Region
        </Button>
      </div>

      {/* Regions Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead>Region Name</TableHead>
              <TableHead>City Manager</TableHead>
              <TableHead>Manager Email</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No regions found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              regions.map((region) => (
                <TableRow key={region.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">{region.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {region.manager ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {region.manager.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <span className="text-foreground">{region.manager.full_name}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">No manager assigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {region.manager?.email || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(region.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8"
                        onClick={() => handleOpenDialog(region)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8 text-danger hover:text-danger"
                        onClick={() => handleDeleteRegion(region.id, region.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Region Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRegion ? 'Edit Region' : 'Add Region'}</DialogTitle>
            <DialogDescription>
              {editingRegion 
                ? 'Update region details and city manager assignment' 
                : 'Create a new region and assign a city manager'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Region Name *</Label>
              <Input 
                placeholder="e.g., Lahore Region, Central Region" 
                value={regionName}
                onChange={(e) => setRegionName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>City Manager</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select city manager (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="">No manager</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Assign an admin to manage this region's operations
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRegion}>
              {editingRegion ? 'Update' : 'Create'} Region
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}