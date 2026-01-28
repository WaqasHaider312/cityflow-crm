import { cn } from '@/lib/utils';

type Priority = 'Low' | 'Normal' | 'High' | 'Critical';

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

const priorityConfig: Record<Priority, { label: string; className: string; dot?: boolean }> = {
  'Low': { label: 'Low', className: 'bg-muted text-muted-foreground' },
  'Normal': { label: 'Normal', className: 'bg-primary/10 text-primary' },
  'High': { label: 'High', className: 'bg-warning/15 text-warning' },
  'Critical': { label: 'Critical', className: 'bg-danger/15 text-danger', dot: true },
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        config.dot && 'animate-pulse-subtle',
        className
      )}
    >
      {config.dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
      )}
      {config.label}
    </span>
  );
}
