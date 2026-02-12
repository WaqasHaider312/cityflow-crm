import { X, CheckCircle2, Users, ArrowUpRight, Layers, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onResolve: () => void;
  onReassign: () => void;
  onEscalate: () => void;
  onGroup: () => void;
  onRespond: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onClear,
  onResolve,
  onReassign,
  onEscalate,
  onGroup,
  onRespond,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'bg-foreground text-background rounded-lg shadow-float px-4 py-3',
        'flex items-center gap-4 animate-slide-in-bottom'
      )}
    >
      <span className="text-sm font-medium">
        {selectedCount} ticket{selectedCount > 1 ? 's' : ''} selected
      </span>

      <div className="h-4 w-px bg-background/20" />

      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" className="text-background hover:text-background hover:bg-background/10" onClick={onResolve}>
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Resolve
        </Button>

        <Button size="sm" variant="ghost" className="text-background hover:text-background hover:bg-background/10" onClick={onReassign}>
          <Users className="w-4 h-4 mr-1" />
          Reassign
        </Button>

        <Button size="sm" variant="ghost" className="text-background hover:text-background hover:bg-background/10" onClick={onEscalate}>
          <ArrowUpRight className="w-4 h-4 mr-1" />
          Escalate
        </Button>

        <Button size="sm" variant="ghost" className="text-background hover:text-background hover:bg-background/10" onClick={onRespond}>
          <MessageSquare className="w-4 h-4 mr-1" />
          Respond
        </Button>

        <Button size="sm" variant="ghost" className="text-background hover:text-background hover:bg-background/10" onClick={onGroup}>
          <Layers className="w-4 h-4 mr-1" />
          Add to Group
        </Button>
      </div>

      <div className="h-4 w-px bg-background/20" />

      <Button size="icon" variant="ghost" className="w-8 h-8 text-background hover:text-background hover:bg-background/10" onClick={onClear}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}