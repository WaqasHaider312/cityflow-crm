import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type SLAStatus = 'on-track' | 'warning' | 'breached';

interface SLATimerProps {
  remaining: string;
  status: SLAStatus;
  className?: string;
}

export function SLATimer({ remaining, status, className }: SLATimerProps) {
  const statusClasses = {
    'on-track': 'text-success',
    'warning': 'text-warning',
    'breached': 'text-danger',
  };

  const isBreached = status === 'breached';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium',
        statusClasses[status],
        isBreached && 'animate-pulse-subtle',
        className
      )}
    >
      <Clock className="w-4 h-4" />
      <span>
        {isBreached ? `${remaining} overdue` : `${remaining} remaining`}
      </span>
    </div>
  );
}
