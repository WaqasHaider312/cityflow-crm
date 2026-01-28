import { cn } from '@/lib/utils';

type Status = 'New' | 'Assigned' | 'In Progress' | 'Pending' | 'Resolved' | 'Closed';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  'New': { label: 'New', className: 'bg-primary text-primary-foreground' },
  'Assigned': { label: 'Assigned', className: 'bg-info text-info-foreground' },
  'In Progress': { label: 'In Progress', className: 'bg-warning text-warning-foreground' },
  'Pending': { label: 'Pending', className: 'bg-warning/20 text-warning' },
  'Resolved': { label: 'Resolved', className: 'bg-success text-success-foreground' },
  'Closed': { label: 'Closed', className: 'bg-muted text-muted-foreground' },
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
