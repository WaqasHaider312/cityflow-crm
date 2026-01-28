// Mock Data for CityTeam CRM

export interface User {
  id: number;
  name: string;
  role: 'Super Admin' | 'Team Admin' | 'Team Member';
  team: string;
  avatar: string;
  email: string;
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  issueType: string;
  supplier: string;
  city: string;
  priority: 'Low' | 'Normal' | 'High' | 'Critical';
  status: 'New' | 'Assigned' | 'In Progress' | 'Pending' | 'Resolved' | 'Closed';
  assignedTo: string;
  createdAt: string;
  slaRemaining: string;
  slaStatus: 'on-track' | 'warning' | 'breached';
  groupId: string | null;
  watchers: string[];
  comments: Comment[];
}

export interface Comment {
  id: number;
  author: string;
  content: string;
  timestamp: string;
  isInternal: boolean;
}

export interface TicketGroup {
  id: string;
  name: string;
  issueType: string;
  city: string;
  ticketCount: number;
  assignedTo: string;
  createdAt: string;
  slaRemaining: string;
  status: 'Active' | 'Resolved';
}

export interface IssueType {
  id: number;
  name: string;
  icon: string;
  defaultSLA: string;
  team: string;
}

export interface Team {
  id: number;
  name: string;
  memberCount: number;
  activeTickets: number;
  icon: string;
  description: string;
}

export interface Notification {
  id: number;
  type: 'overdue' | 'warning' | 'resolved' | 'assigned' | 'mention';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  ticketId?: string;
}

export const users: User[] = [
  { id: 1, name: "Ahmed Khan", role: "Team Member", team: "Logistics", avatar: "AK", email: "ahmed@cityteam.com" },
  { id: 2, name: "Sarah Ali", role: "Team Admin", team: "Finance", avatar: "SA", email: "sarah@cityteam.com" },
  { id: 3, name: "Bilal Ahmed", role: "Super Admin", team: "Admin", avatar: "BA", email: "bilal@cityteam.com" },
  { id: 4, name: "Fatima Noor", role: "Team Member", team: "City Team - Karachi", avatar: "FN", email: "fatima@cityteam.com" },
  { id: 5, name: "Omar Hassan", role: "Team Member", team: "Logistics", avatar: "OH", email: "omar@cityteam.com" },
  { id: 6, name: "Ayesha Malik", role: "Team Admin", team: "3PL Coordination", avatar: "AM", email: "ayesha@cityteam.com" },
  { id: 7, name: "Zain Raza", role: "Team Member", team: "City Team - Lahore", avatar: "ZR", email: "zain@cityteam.com" },
  { id: 8, name: "Hira Shah", role: "Team Member", team: "Finance", avatar: "HS", email: "hira@cityteam.com" },
];

export const issueTypes: IssueType[] = [
  { id: 1, name: "Pickup Issue", icon: "📦", defaultSLA: "6 hours", team: "Logistics" },
  { id: 2, name: "Payment Delay", icon: "💰", defaultSLA: "24 hours", team: "Finance" },
  { id: 3, name: "Delivery Issue", icon: "🚚", defaultSLA: "4 hours", team: "Logistics" },
  { id: 4, name: "Product Query", icon: "❓", defaultSLA: "12 hours", team: "City Team" },
  { id: 5, name: "3PL Issue", icon: "🏢", defaultSLA: "8 hours", team: "3PL Coordination" },
  { id: 6, name: "Invoice Discrepancy", icon: "📄", defaultSLA: "48 hours", team: "Finance" },
  { id: 7, name: "Stock Issue", icon: "📊", defaultSLA: "6 hours", team: "Logistics" },
];

export const teams: Team[] = [
  { id: 1, name: "Logistics", memberCount: 8, activeTickets: 24, icon: "📦", description: "Handles all pickup and delivery operations" },
  { id: 2, name: "Finance", memberCount: 4, activeTickets: 12, icon: "💰", description: "Manages payments and invoicing" },
  { id: 3, name: "City Team - Karachi", memberCount: 6, activeTickets: 18, icon: "🏙️", description: "Local operations for Karachi region" },
  { id: 4, name: "City Team - Lahore", memberCount: 5, activeTickets: 15, icon: "🏙️", description: "Local operations for Lahore region" },
  { id: 5, name: "3PL Coordination", memberCount: 3, activeTickets: 8, icon: "🏢", description: "Third-party logistics coordination" },
];

export const tickets: Ticket[] = [
  {
    id: "T1234",
    subject: "Pickup not completed - driver did not arrive",
    description: "The scheduled pickup for order #ORD-5678 was not completed. The driver marked it as attempted but the supplier confirms they were present.",
    issueType: "Pickup Issue",
    supplier: "Supplier A - FastTech Electronics",
    city: "Karachi",
    priority: "High",
    status: "Assigned",
    assignedTo: "Ahmed Khan",
    createdAt: "2h ago",
    slaRemaining: "4h 30m",
    slaStatus: "on-track",
    groupId: "G001",
    watchers: ["Omar Hassan", "Fatima Noor"],
    comments: [
      { id: 1, author: "Fatima Noor", content: "I've contacted the supplier, they confirm they were available.", timestamp: "1h ago", isInternal: false },
      { id: 2, author: "Ahmed Khan", content: "Checking with the driver now.", timestamp: "30m ago", isInternal: true },
    ]
  },
  {
    id: "T1235",
    subject: "Payment not received for September invoice",
    description: "Supplier has not received payment for invoice #INV-2023-0945 dated September 15th.",
    issueType: "Payment Delay",
    supplier: "Supplier B - Global Goods Co",
    city: "Lahore",
    priority: "Critical",
    status: "In Progress",
    assignedTo: "Sarah Ali",
    createdAt: "8h ago",
    slaRemaining: "-2h",
    slaStatus: "breached",
    groupId: null,
    watchers: ["Hira Shah"],
    comments: [
      { id: 1, author: "Sarah Ali", content: "Escalating to finance director for approval.", timestamp: "4h ago", isInternal: true },
    ]
  },
  {
    id: "T1236",
    subject: "Wrong items delivered to warehouse",
    description: "Order #ORD-7890 received incorrect SKUs. Expected 50x Widget-A, received 50x Widget-B.",
    issueType: "Delivery Issue",
    supplier: "Supplier C - Prime Parts Ltd",
    city: "Karachi",
    priority: "High",
    status: "Pending",
    assignedTo: "Omar Hassan",
    createdAt: "3h ago",
    slaRemaining: "1h 15m",
    slaStatus: "warning",
    groupId: null,
    watchers: [],
    comments: []
  },
  {
    id: "T1237",
    subject: "Pickup rescheduled without notice",
    description: "Driver rescheduled pickup to tomorrow without informing the supplier.",
    issueType: "Pickup Issue",
    supplier: "Supplier D - QuickShip Solutions",
    city: "Karachi",
    priority: "Normal",
    status: "Assigned",
    assignedTo: "Ahmed Khan",
    createdAt: "1h ago",
    slaRemaining: "5h",
    slaStatus: "on-track",
    groupId: "G001",
    watchers: [],
    comments: []
  },
  {
    id: "T1238",
    subject: "Invoice amount mismatch",
    description: "Invoice #INV-2023-1002 shows PKR 150,000 but agreed amount was PKR 140,000.",
    issueType: "Invoice Discrepancy",
    supplier: "Supplier E - Metro Distributors",
    city: "Islamabad",
    priority: "Normal",
    status: "New",
    assignedTo: "Hira Shah",
    createdAt: "30m ago",
    slaRemaining: "47h 30m",
    slaStatus: "on-track",
    groupId: null,
    watchers: [],
    comments: []
  },
  {
    id: "T1239",
    subject: "3PL delayed shipment by 3 days",
    description: "TCS delayed the inter-city shipment, causing stockout at destination warehouse.",
    issueType: "3PL Issue",
    supplier: "TCS Logistics",
    city: "Lahore",
    priority: "High",
    status: "In Progress",
    assignedTo: "Ayesha Malik",
    createdAt: "5h ago",
    slaRemaining: "3h",
    slaStatus: "warning",
    groupId: null,
    watchers: ["Zain Raza"],
    comments: []
  },
  {
    id: "T1240",
    subject: "Product specifications query",
    description: "Supplier asking for updated product specifications for new SKU lineup.",
    issueType: "Product Query",
    supplier: "Supplier F - Digital Dynamics",
    city: "Karachi",
    priority: "Low",
    status: "Assigned",
    assignedTo: "Fatima Noor",
    createdAt: "4h ago",
    slaRemaining: "8h",
    slaStatus: "on-track",
    groupId: null,
    watchers: [],
    comments: []
  },
  {
    id: "T1241",
    subject: "Stock count discrepancy after audit",
    description: "Physical count shows 20 units less than system inventory for SKU-12345.",
    issueType: "Stock Issue",
    supplier: "Internal",
    city: "Karachi",
    priority: "High",
    status: "New",
    assignedTo: "Omar Hassan",
    createdAt: "1h ago",
    slaRemaining: "5h",
    slaStatus: "on-track",
    groupId: null,
    watchers: [],
    comments: []
  },
  {
    id: "T1242",
    subject: "Multiple pickup failures this week",
    description: "Third failed pickup attempt for this supplier in one week.",
    issueType: "Pickup Issue",
    supplier: "Supplier A - FastTech Electronics",
    city: "Karachi",
    priority: "Critical",
    status: "Assigned",
    assignedTo: "Ahmed Khan",
    createdAt: "45m ago",
    slaRemaining: "5h 15m",
    slaStatus: "on-track",
    groupId: "G001",
    watchers: ["Bilal Ahmed"],
    comments: []
  },
  {
    id: "T1243",
    subject: "Payment pending for 45 days",
    description: "Long overdue payment affecting supplier relationship.",
    issueType: "Payment Delay",
    supplier: "Supplier G - ValueMart",
    city: "Lahore",
    priority: "Critical",
    status: "In Progress",
    assignedTo: "Sarah Ali",
    createdAt: "2d ago",
    slaRemaining: "-20h",
    slaStatus: "breached",
    groupId: "G002",
    watchers: ["Bilal Ahmed", "Hira Shah"],
    comments: []
  },
  {
    id: "T1244",
    subject: "Delivery damaged during transit",
    description: "5 units of fragile items arrived broken. Need replacement process.",
    issueType: "Delivery Issue",
    supplier: "Supplier H - Crystal Imports",
    city: "Lahore",
    priority: "High",
    status: "Pending",
    assignedTo: "Zain Raza",
    createdAt: "6h ago",
    slaRemaining: "-2h",
    slaStatus: "breached",
    groupId: null,
    watchers: [],
    comments: []
  },
  {
    id: "T1245",
    subject: "Pickup location changed last minute",
    description: "Supplier moved to new address but system not updated.",
    issueType: "Pickup Issue",
    supplier: "Supplier I - TechZone",
    city: "Karachi",
    priority: "Normal",
    status: "Resolved",
    assignedTo: "Ahmed Khan",
    createdAt: "1d ago",
    slaRemaining: "Completed",
    slaStatus: "on-track",
    groupId: "G001",
    watchers: [],
    comments: []
  },
  // More tickets for variety
  {
    id: "T1246",
    subject: "COD amount not collected",
    description: "Driver forgot to collect cash on delivery for order #ORD-9012.",
    issueType: "Delivery Issue",
    supplier: "Supplier J - Home Essentials",
    city: "Karachi",
    priority: "High",
    status: "Assigned",
    assignedTo: "Fatima Noor",
    createdAt: "2h ago",
    slaRemaining: "2h",
    slaStatus: "warning",
    groupId: null,
    watchers: [],
    comments: []
  },
  {
    id: "T1247",
    subject: "3PL partner unresponsive",
    description: "Leopard Courier not responding to tracking queries.",
    issueType: "3PL Issue",
    supplier: "Leopard Courier",
    city: "Islamabad",
    priority: "Normal",
    status: "Assigned",
    assignedTo: "Ayesha Malik",
    createdAt: "3h ago",
    slaRemaining: "5h",
    slaStatus: "on-track",
    groupId: null,
    watchers: [],
    comments: []
  },
  {
    id: "T1248",
    subject: "Payment made to wrong account",
    description: "Finance transferred to old bank account of supplier.",
    issueType: "Payment Delay",
    supplier: "Supplier K - Allied Trading",
    city: "Lahore",
    priority: "Critical",
    status: "In Progress",
    assignedTo: "Sarah Ali",
    createdAt: "4h ago",
    slaRemaining: "20h",
    slaStatus: "on-track",
    groupId: "G002",
    watchers: [],
    comments: []
  },
];

export const ticketGroups: TicketGroup[] = [
  {
    id: "G001",
    name: "Pickup Issue - Karachi",
    issueType: "Pickup Issue",
    city: "Karachi",
    ticketCount: 12,
    assignedTo: "Ahmed Khan",
    createdAt: "2h ago",
    slaRemaining: "4h 15m",
    status: "Active"
  },
  {
    id: "G002",
    name: "Payment Delay - Lahore",
    issueType: "Payment Delay",
    city: "Lahore",
    ticketCount: 5,
    assignedTo: "Sarah Ali",
    createdAt: "4h ago",
    slaRemaining: "20h",
    status: "Active"
  },
  {
    id: "G003",
    name: "Delivery Issue - Multi City",
    issueType: "Delivery Issue",
    city: "Multiple",
    ticketCount: 8,
    assignedTo: "Omar Hassan",
    createdAt: "1d ago",
    slaRemaining: "2h 30m",
    status: "Active"
  },
  {
    id: "G004",
    name: "3PL Issues - October",
    issueType: "3PL Issue",
    city: "All Cities",
    ticketCount: 6,
    assignedTo: "Ayesha Malik",
    createdAt: "3d ago",
    slaRemaining: "12h",
    status: "Active"
  },
];

export const notifications: Notification[] = [
  { id: 1, type: 'overdue', title: 'Ticket #T1235 is overdue', description: 'Payment not received for September invoice', timestamp: '2 min ago', read: false, ticketId: 'T1235' },
  { id: 2, type: 'warning', title: 'SLA warning for #T1236', description: 'Due in 1 hour', timestamp: '15 min ago', read: false, ticketId: 'T1236' },
  { id: 3, type: 'resolved', title: 'Ticket #T1245 resolved', description: 'Pickup location issue fixed', timestamp: '1h ago', read: false, ticketId: 'T1245' },
  { id: 4, type: 'assigned', title: 'New ticket assigned', description: 'Stock count discrepancy #T1241', timestamp: '1h ago', read: true, ticketId: 'T1241' },
  { id: 5, type: 'mention', title: 'You were mentioned', description: 'Bilal Ahmed mentioned you in #T1242', timestamp: '2h ago', read: true, ticketId: 'T1242' },
];

export const activityLog = [
  { id: 1, action: 'resolved', user: 'Ahmed Khan', ticket: 'T1245', description: 'Marked as resolved', timestamp: '1h ago' },
  { id: 2, action: 'commented', user: 'Sarah Ali', ticket: 'T1235', description: 'Added internal note', timestamp: '2h ago' },
  { id: 3, action: 'escalated', user: 'Ayesha Malik', ticket: 'T1239', description: 'Escalated to Tier 2', timestamp: '3h ago' },
  { id: 4, action: 'created', user: 'Fatima Noor', ticket: 'T1246', description: 'Created new ticket', timestamp: '3h ago' },
  { id: 5, action: 'assigned', user: 'System', ticket: 'T1241', description: 'Auto-assigned to Omar Hassan', timestamp: '4h ago' },
  { id: 6, action: 'grouped', user: 'Bilal Ahmed', ticket: 'T1242', description: 'Added to group G001', timestamp: '4h ago' },
];

export const suppliers = [
  "Supplier A - FastTech Electronics",
  "Supplier B - Global Goods Co",
  "Supplier C - Prime Parts Ltd",
  "Supplier D - QuickShip Solutions",
  "Supplier E - Metro Distributors",
  "Supplier F - Digital Dynamics",
  "Supplier G - ValueMart",
  "Supplier H - Crystal Imports",
  "Supplier I - TechZone",
  "Supplier J - Home Essentials",
  "Supplier K - Allied Trading",
  "TCS Logistics",
  "Leopard Courier",
];

export const cities = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan"];

export const currentUser: User = users[2]; // Bilal Ahmed - Super Admin
