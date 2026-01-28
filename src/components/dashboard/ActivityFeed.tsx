import { CheckCircle2, MessageCircle, ArrowUpRight, Plus, UserPlus, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { activityLog } from '@/lib/mockData';

const actionIcons = {
  resolved: <CheckCircle2 className="w-4 h-4 text-success" />,
  commented: <MessageCircle className="w-4 h-4 text-primary" />,
  escalated: <ArrowUpRight className="w-4 h-4 text-warning" />,
  created: <Plus className="w-4 h-4 text-info" />,
  assigned: <UserPlus className="w-4 h-4 text-muted-foreground" />,
  grouped: <Layers className="w-4 h-4 text-info" />,
};

export function ActivityFeed() {
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Recent Activity</h3>
      </div>

      <div className="divide-y divide-border">
        {activityLog.map((activity) => (
          <div
            key={activity.id}
            className="p-4 flex items-start gap-3 hover:bg-secondary/50 cursor-pointer transition-colors"
            onClick={() => navigate(`/tickets/${activity.ticket}`)}
          >
            <div className="flex-shrink-0 mt-0.5">
              {actionIcons[activity.action as keyof typeof actionIcons]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                <span className="font-medium">{activity.user}</span>
                {' '}
                <span className="text-muted-foreground">{activity.description}</span>
                {' on '}
                <span className="font-medium text-primary">#{activity.ticket}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
