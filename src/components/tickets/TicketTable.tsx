import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { SLATimer } from '@/components/common/SLATimer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Ticket } from '@/lib/mockData';
import { cn } from '@/lib/utils';

interface TicketTableProps {
  tickets: Ticket[];
  selectedIds: string[];
  onSelectChange: (ids: string[]) => void;
}

export function TicketTable({ tickets, selectedIds, onSelectChange }: TicketTableProps) {
  const navigate = useNavigate();

  const allSelected = tickets.length > 0 && selectedIds.length === tickets.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < tickets.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectChange(tickets.map((t) => t.id));
    } else {
      onSelectChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectChange([...selectedIds, id]);
    } else {
      onSelectChange(selectedIds.filter((sid) => sid !== id));
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50 hover:bg-secondary/50">
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    (el as any).indeterminate = someSelected;
                  }
                }}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead className="w-24">ID</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-24">Priority</TableHead>
            <TableHead className="w-36">Assigned To</TableHead>
            <TableHead className="w-36">SLA</TableHead>
            <TableHead className="w-24">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow
              key={ticket.id}
              className={cn(
                'cursor-pointer hover:bg-secondary/30',
                selectedIds.includes(ticket.id) && 'bg-primary/5'
              )}
              onClick={() => navigate(`/tickets/${ticket.id}`)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.includes(ticket.id)}
                  onCheckedChange={(checked) => handleSelectOne(ticket.id, checked as boolean)}
                />
              </TableCell>
              <TableCell className="font-medium text-muted-foreground">#{ticket.id}</TableCell>
              <TableCell>
                <div className="max-w-xs truncate">{ticket.subject}</div>
              </TableCell>
              <TableCell>
                <StatusBadge status={ticket.status} />
              </TableCell>
              <TableCell>
                <PriorityBadge priority={ticket.priority} />
              </TableCell>
              <TableCell className="text-sm">{ticket.assignedTo}</TableCell>
              <TableCell>
                {ticket.status !== 'Resolved' && ticket.status !== 'Closed' ? (
                  <SLATimer
                    remaining={ticket.slaRemaining}
                    status={ticket.slaStatus}
                    className="text-xs"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">Completed</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{ticket.createdAt}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
