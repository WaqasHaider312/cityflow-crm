import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Inbox,
  Layers,
  Users,
  BarChart3,
  Plus,
  Search,
  Settings,
  Shield,
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleSelect = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command className="rounded-lg border-0">
        <CommandInput placeholder="Search tickets, teams, actions..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => handleSelect('/tickets/create')}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Ticket
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('/tickets')}>
              <Search className="mr-2 h-4 w-4" />
              Search All Tickets
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => handleSelect('/dashboard')}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('/tickets')}>
              <Inbox className="mr-2 h-4 w-4" />
              My Tickets
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('/tickets/grouped')}>
              <Layers className="mr-2 h-4 w-4" />
              Grouped Issues
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('/teams')}>
              <Users className="mr-2 h-4 w-4" />
              Teams
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('/reports')}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Reports
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Admin">
            <CommandItem onSelect={() => handleSelect('/admin/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('/admin/users')}>
              <Shield className="mr-2 h-4 w-4" />
              User Management
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
