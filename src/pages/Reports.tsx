import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Download, Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ticketsOverTime = [
  { date: 'Mon', tickets: 45, resolved: 38 },
  { date: 'Tue', tickets: 52, resolved: 45 },
  { date: 'Wed', tickets: 48, resolved: 50 },
  { date: 'Thu', tickets: 61, resolved: 55 },
  { date: 'Fri', tickets: 55, resolved: 48 },
  { date: 'Sat', tickets: 32, resolved: 35 },
  { date: 'Sun', tickets: 28, resolved: 30 },
];

const resolutionByTeam = [
  { team: 'Logistics', rate: 94 },
  { team: 'Finance', rate: 88 },
  { team: 'City - Karachi', rate: 91 },
  { team: 'City - Lahore', rate: 86 },
  { team: '3PL', rate: 82 },
];

const slaCompliance = [
  { name: 'On Track', value: 68, color: 'hsl(var(--success))' },
  { name: 'Warning', value: 22, color: 'hsl(var(--warning))' },
  { name: 'Breached', value: 10, color: 'hsl(var(--danger))' },
];

const topIssueTypes = [
  { type: 'Pickup Issue', count: 45 },
  { type: 'Payment Delay', count: 32 },
  { type: 'Delivery Issue', count: 28 },
  { type: '3PL Issue', count: 18 },
  { type: 'Invoice Discrepancy', count: 12 },
];

export default function Reports() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Track performance and identify trends</p>
        </div>
        <div className="flex items-center gap-3">
          <Select defaultValue="7d">
            <SelectTrigger className="w-40 bg-card">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets Over Time */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">Tickets Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ticketsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="tickets"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  name="Created"
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={false}
                  name="Resolved"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SLA Compliance */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">SLA Compliance</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slaCompliance}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {slaCompliance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {slaCompliance.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {item.name}: {item.value}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Resolution Rate by Team */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">Resolution Rate by Team</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resolutionByTeam} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="team" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Issue Types */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">Top Issue Types</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topIssueTypes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="type" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--info))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
