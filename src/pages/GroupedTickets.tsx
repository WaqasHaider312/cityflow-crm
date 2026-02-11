
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GroupedIssueCard } from '@/components/dashboard/GroupedIssueCard';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export default function GroupedTickets() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ticketGroups, setTicketGroups] = useState([]);

  // Fetch ticket groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
        .from('ticket_groups')
        .select(`
          *,
          issue_type:issue_types!ticket_groups_issue_type_id_fkey(name, icon),
          assigned_user:profiles!ticket_groups_assigned_to_fkey(full_name),
          tickets(id)
        `)
        .order('created_at', { ascending: false });

        if (error) throw error;

        setTicketGroups(data || []);
      } catch (error) {
        console.error('Error fetching ticket groups:', error);
        toast({ title: "Error loading groups", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  const activeGroups = ticketGroups.filter((g) => g.status === 'active' || !g.status);
  const resolvedGroups = ticketGroups.filter((g) => g.status === 'resolved');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Grouped Issues</h1>
            <p className="text-muted-foreground mt-1">Loading...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-6 h-48 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

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
        {activeGroups.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-8 text-center">
            <p className="text-muted-foreground">No active groups at the moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGroups.map((group) => (
              <GroupedIssueCard key={group.id} group={group} />
            ))}
          </div>
        )}
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