import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, Search, MapPin } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

export default function CityMapping() {
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState([]);
  const [regions, setRegions] = useState([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  
  // Form state
  const [cityName, setCityName] = useState('');
  const [regionId, setRegionId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch city mappings
      const { data: citiesData, error: citiesError } = await supabase
        .from('city_region_mapping')
        .select(`
          *,
          region:regions(id, name, manager:profiles!regions_manager_id_fkey(full_name))
        `)
        .order('city_name');

      if (citiesError) throw citiesError;

      // Fetch regions
      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('*')
        .order('name');

      if (regionsError) throw regionsError;

      setCities(citiesData || []);
      setRegions(regionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Error loading cities", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (city = null) => {
    if (city) {
      setEditingCity(city);
      setCityName(city.city_name);
      setRegionId(city.region_id);
    } else {
      setEditingCity(null);
      setCityName('');
      setRegionId('');
    }
    setDialogOpen(true);
  };

  const handleSaveCity = async () => {
    if (!cityName.trim()) {
      toast({ title: "City name is required", variant: "destructive" });
      return;
    }
    if (!regionId) {
      toast({ title: "Region is required", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingCity) {
        // Update existing mapping
        const { error } = await supabase
          .from('city_region_mapping')
          .update({
            city_name: cityName,
            region_id: regionId
          })
          .eq('id', editingCity.id);

        if (error) throw error;
        toast({ title: "City Updated" });
      } else {
        // Create new mapping
        const { error } = await supabase
          .from('city_region_mapping')
          .insert({
            city_name: cityName,
            region_id: regionId,
            created_by: user.id
          });

        if (error) throw error;
        toast({ title: "City Mapped" });
      }

      setDialogOpen(false);
      setCityName('');
      setRegionId('');
      setEditingCity(null);
      fetchData();
    } catch (error) {
      console.error('Error saving city:', error);
      toast({ 
        title: "Error saving city",
        description: error.message.includes('duplicate') ? 'City already exists' : error.message,
        variant: "destructive" 
      });
    }
  };

  const handleDeleteCity = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from city mapping?`)) return;

    try {
      const { error } = await supabase
        .from('city_region_mapping')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "City Removed" });
      fetchData();
    } catch (error) {
      console.error('Error deleting city:', error);
      toast({ title: "Error removing city", variant: "destructive" });
    }
  };

  const filteredCities = cities.filter((city) =>
    city.city_name.toLowerCase().includes(search.toLowerCase()) ||
    city.region?.name.toLowerCase().includes(search.toLowerCase())
  );

  // Group cities by region
  const citiesByRegion = filteredCities.reduce((acc, city) => {
    const regionName = city.region?.name || 'Unmapped';
    if (!acc[regionName]) acc[regionName] = [];
    acc[regionName].push(city);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">City Mapping</h1>
          <p className="text-muted-foreground mt-1">Loading...</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <p className="text-muted-foreground">Loading cities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">City Mapping</h1>
          <p className="text-muted-foreground mt-1">
            Map cities to regions for proper ticket routing
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add City
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search cities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Cities</p>
          <p className="text-2xl font-bold text-foreground">{cities.length}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Regions</p>
          <p className="text-2xl font-bold text-foreground">{regions.length}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Avg per Region</p>
          <p className="text-2xl font-bold text-foreground">
            {regions.length > 0 ? Math.round(cities.length / regions.length) : 0}
          </p>
        </div>
      </div>

      {/* Cities Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead>City</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>City Manager</TableHead>
              <TableHead>Mapped By</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {search ? 'No cities found matching your search' : 'No cities mapped yet. Add one to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCities.map((city) => (
                <TableRow key={city.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{city.city_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {city.region?.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {city.region?.manager?.full_name || 'No manager'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(city.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8"
                        onClick={() => handleOpenDialog(city)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8 text-danger hover:text-danger"
                        onClick={() => handleDeleteCity(city.id, city.city_name)}
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

      {/* Add/Edit City Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCity ? 'Edit City Mapping' : 'Add City'}</DialogTitle>
            <DialogDescription>
              {editingCity 
                ? 'Update the region assignment for this city' 
                : 'Map a new city to a region'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>City Name *</Label>
              <Input 
                placeholder="e.g., Lahore, Karachi, Islamabad" 
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                disabled={editingCity !== null}
              />
              {editingCity && (
                <p className="text-xs text-muted-foreground">
                  City name cannot be changed. Delete and recreate if needed.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Region *</Label>
              <Select value={regionId} onValueChange={setRegionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {regions.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No regions available. Create one first.
                    </div>
                  ) : (
                    regions.map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCity} disabled={regions.length === 0}>
              {editingCity ? 'Update' : 'Add'} City
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}