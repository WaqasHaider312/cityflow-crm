import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SLATimerProps {
  remaining: string; // sla_due_at timestamp
  status?: string;
  className?: string;
}

function formatTimeDiff(dueDateStr: string): { label: string; status: 'on-track' | 'warning' | 'breached' } {
  const now = new Date();
  const due = new Date(dueDateStr);
  const diffMs = due.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);

  const hours = Math.floor(absMs / (1000 * 60 * 60));
  const minutes = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));

  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  if (diffMs < 0) {
    return { label: `${timeStr} overdue`, status: 'breached' };
  } else if (diffMs < 2 * 60 * 60 * 1000) {
    return { label: `${timeStr} remaining`, status: 'warning' };
  } else {
    return { label: `${timeStr} remaining`, status: 'on-track' };
  }
}

export function SLATimer({ remaining, className }: SLATimerProps) {
  if (!remaining) return null;

  const { label, status } = formatTimeDiff(remaining);

  const statusClasses = {
    'on-track': 'text-success',
    'warning': 'text-warning',
    'breached': 'text-danger',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium',
        statusClasses[status],
        status === 'breached' && 'animate-pulse-subtle',
        className
      )}
    >
      <Clock className="w-4 h-4" />
      <span>{label}</span>
    </div>
  );
}