import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GroupedIssueCard } from '@/components/dashboard/GroupedIssueCard';
import { ticketGroups } from '@/lib/mockData';

export default function GroupedTickets() {
  const navigate = useNavigate();

  const activeGroups = ticketGroups.filter((g) => g.status === 'Active');
  const resolvedGroups = ticketGroups.filter((g) => g.status === 'Resolved');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Grouped Issues</h1>
          <p className="text-muted-foreground mt-1">
            Manage tickets grouped by issue type and city
          </p>
        </div>
        <Button onClick={() => navigate('/tickets/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Active Groups */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Active Groups ({activeGroups.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeGroups.map((group) => (
            <GroupedIssueCard key={group.id} group={group} />
          ))}
        </div>
      </div>

      {/* Resolved Groups */}
      {resolvedGroups.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Resolved Groups ({resolvedGroups.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
            {resolvedGroups.map((group) => (
              <GroupedIssueCard key={group.id} group={group} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
