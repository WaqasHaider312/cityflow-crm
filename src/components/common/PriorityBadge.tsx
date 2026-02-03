import { cn } from '@/lib/utils';

type Priority = 'low' | 'normal' | 'high' | 'critical';


interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

const priorityConfig: Record<Priority, { label: string; className: string; dot?: boolean }> = {
  'low': { label: 'Low', className: 'bg-muted text-muted-foreground' },
  'normal': { label: 'Normal', className: 'bg-primary/10 text-primary' },
  'high': { label: 'High', className: 'bg-warning/15 text-warning' },
  'critical': { label: 'Critical', className: 'bg-danger/15 text-danger', dot: true },
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
