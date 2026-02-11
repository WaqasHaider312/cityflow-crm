import { CheckCircle2, MessageCircle, ArrowUpRight, Plus, UserPlus, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

const actionIcons = {
  resolved: <CheckCircle2 className="w-4 h-4 text-success" />,
  commented: <MessageCircle className="w-4 h-4 text-primary" />,
  escalated: <ArrowUpRight className="w-4 h-4 text-warning" />,
  created: <Plus className="w-4 h-4 text-info" />,
  assigned: <UserPlus className="w-4 h-4 text-muted-foreground" />,
  grouped: <Layers className="w-4 h-4 text-info" />,
  status_changed: <CheckCircle2 className="w-4 h-4 text-success" />,
};

export function ActivityFeed() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select(`
            *,
            user:profiles!activity_logs_user_id_fkey(full_name),
            ticket:tickets!activity_logs_ticket_id_fkey(ticket_number)
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setActivities(data || []);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const getDescription = (activity) => {
    switch (activity.action) {
      case 'created':
        return 'created ticket';
      case 'assigned':
        return `assigned ticket to ${activity.new_value}`;
      case 'status_changed':
        return `changed status from ${activity.old_value} to ${activity.new_value}`;
      case 'resolved':
        return 'resolved ticket';
      case 'escalated':
        return 'escalated ticket';
      case 'commented':
        return 'commented on ticket';
      case 'grouped':
        return 'grouped ticket';
      default:
        return activity.action;
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Recent Activity</h3>
        </div>
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Recent Activity</h3>
      </div>

      <div className="divide-y divide-border">
        {activities.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No recent activity</div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="p-4 flex items-start gap-3 hover:bg-secondary/50 cursor-pointer transition-colors"
              onClick={() => navigate(`/tickets/${activity.ticket_id}`)}
            >
              <div className="flex-shrink-0 mt-0.5">
                {actionIcons[activity.action as keyof typeof actionIcons] || actionIcons.created}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{activity.user?.full_name || 'Unknown'}</span>
                  {' '}
                  <span className="text-muted-foreground">{getDescription(activity)}</span>
                  {' on '}
                  <span className="font-medium text-primary">#{activity.ticket?.ticket_number || 'N/A'}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
