import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { issueTypes, teams, cities } from '@/lib/mockData';

type Status = 'All' | 'New' | 'Assigned' | 'In Progress' | 'Pending' | 'Resolved' | 'Closed';
type Priority = 'All' | 'Low' | 'Normal' | 'High' | 'Critical';

interface TicketFiltersProps {
  status: Status;
  priority: Priority;
  team: string;
  city: string;
  issueType: string;
  onStatusChange: (status: Status) => void;
  onPriorityChange: (priority: Priority) => void;
  onTeamChange: (team: string) => void;
  onCityChange: (city: string) => void;
  onIssueTypeChange: (type: string) => void;
  onClearAll: () => void;
}

export function TicketFilters({
  status,
  priority,
  team,
  city,
  issueType,
  onStatusChange,
  onPriorityChange,
  onTeamChange,
  onCityChange,
  onIssueTypeChange,
  onClearAll,
}: TicketFiltersProps) {
  const hasFilters = status !== 'All' || priority !== 'All' || team !== 'All' || city !== 'All' || issueType !== 'All';

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select value={status} onValueChange={(v) => onStatusChange(v as Status)}>
        <SelectTrigger className="w-36 bg-card">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="All">All Statuses</SelectItem>
          <SelectItem value="New">New</SelectItem>
          <SelectItem value="Assigned">Assigned</SelectItem>
          <SelectItem value="In Progress">In Progress</SelectItem>
          <SelectItem value="Pending">Pending</SelectItem>
          <SelectItem value="Resolved">Resolved</SelectItem>
          <SelectItem value="Closed">Closed</SelectItem>
        </SelectContent>
      </Select>

      <Select value={priority} onValueChange={(v) => onPriorityChange(v as Priority)}>
        <SelectTrigger className="w-32 bg-card">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="All">All Priorities</SelectItem>
          <SelectItem value="Low">Low</SelectItem>
          <SelectItem value="Normal">Normal</SelectItem>
          <SelectItem value="High">High</SelectItem>
          <SelectItem value="Critical">Critical</SelectItem>
        </SelectContent>
      </Select>

      <Select value={team} onValueChange={onTeamChange}>
        <SelectTrigger className="w-40 bg-card">
          <SelectValue placeholder="Team" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="All">All Teams</SelectItem>
          {teams.map((t) => (
            <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={city} onValueChange={onCityChange}>
        <SelectTrigger className="w-32 bg-card">
          <SelectValue placeholder="City" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="All">All Cities</SelectItem>
          {cities.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={issueType} onValueChange={onIssueTypeChange}>
        <SelectTrigger className="w-40 bg-card">
          <SelectValue placeholder="Issue Type" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="All">All Types</SelectItem>
          {issueTypes.map((t) => (
            <SelectItem key={t.id} value={t.name}>
              {t.icon} {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClearAll}>
          <X className="w-4 h-4 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
