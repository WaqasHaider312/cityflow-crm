import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'text-primary',
}: StatsCardProps) {
  const changeColors = {
    positive: 'text-success',
    negative: 'text-danger',
    neutral: 'text-muted-foreground',
  };

  return (
    <div className="bg-card rounded-lg p-6 shadow-subtle card-hover border border-border">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
          {change && (
            <p className={cn('text-sm mt-2', changeColors[changeType])}>
              {change}
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-lg bg-primary/10', iconColor)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
