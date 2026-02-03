import { cn } from '@/lib/utils';

type Status = 'new' | 'assigned' | 'in_progress' | 'pending' | 'resolved' | 'closed';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  'new': { label: 'New', className: 'bg-primary text-primary-foreground' },
  'assigned': { label: 'Assigned', className: 'bg-info text-info-foreground' },
  'in_progress': { label: 'In Progress', className: 'bg-warning text-warning-foreground' },
  'pending': { label: 'Pending', className: 'bg-warning/20 text-warning' },
  'resolved': { label: 'Resolved', className: 'bg-success text-success-foreground' },
  'closed': { label: 'Closed', className: 'bg-muted text-muted-foreground' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
