import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { SLATimer } from '@/components/common/SLATimer';
import { cn } from '@/lib/utils';

interface Ticket {
  id: string;
  ticket_number?: string;
  subject: string;
  status: 'new' | 'assigned' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'critical';
  issue_type?: { name: string; icon: string };
  assigned_user?: { full_name: string };
  supplier_city?: string;
  sla_due_at?: string;
  sla_status?: string;
}

interface TicketCardProps {
  ticket: Ticket;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  showCheckbox?: boolean;
}

export function TicketCard({ ticket, selected, onSelect, showCheckbox = false }: TicketCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        'bg-card rounded-lg p-4 border border-border card-hover cursor-pointer',
        selected && 'ring-2 ring-primary border-primary'
      )}
      onClick={() => navigate(`/tickets/${ticket.id}`)}
    >
      <div className="flex items-start gap-3">
        {showCheckbox && (
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelect?.(ticket.id, checked as boolean)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1"
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              #{ticket.ticket_number || ticket.id.slice(0, 8)}
            </span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>

          <h4 className="font-medium text-foreground truncate mb-2">{ticket.subject}</h4>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-muted-foreground">
              <span>{ticket.issue_type?.icon} {ticket.issue_type?.name}</span>
              <span>•</span>
              <span>{ticket.supplier_city || '-'}</span>
              <span>•</span>
              <span>{ticket.assigned_user?.full_name || 'Unassigned'}</span>
            </div>

            {ticket.status !== 'resolved' && ticket.status !== 'closed' && ticket.sla_due_at && (
              <SLATimer
                remaining={ticket.sla_due_at}
                status={(ticket.sla_status as 'on-track' | 'warning' | 'breached') || 'on-track'}
                className="text-xs"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}