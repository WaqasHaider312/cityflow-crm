import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import TicketsInbox from "@/pages/TicketsInbox";
import GroupedTickets from "@/pages/GroupedTickets";
import GroupDetail from "@/pages/GroupDetail";
import Teams from "@/pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import Reports from "@/pages/Reports";
import AdminSettings from "@/pages/AdminSettings";
import UserManagement from "@/pages/UserManagement";
import NotFound from "@/pages/NotFound";
import RegionsManagement from '@/pages/RegionsManagement';
import CityMapping from '@/pages/CityMapping';
import Broadcasts from "@/pages/Broadcasts";
import FAQs from "@/pages/FAQs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />

          {/* Redirect root to Tickets */}
          <Route path="/" element={<Navigate to="/tickets" replace />} />

          {/* App Routes with Layout */}
          <Route element={<AppLayout />}>
            <Route path="/tickets" element={<TicketsInbox />} />

            {/* Tickets — split view, detail lives inside TicketsInbox */}
            <Route path="/tickets" element={<TicketsInbox />} />
            <Route path="/tickets/grouped" element={<GroupedTickets />} />
            <Route path="/tickets/group/:id" element={<GroupDetail />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:id" element={<TeamDetail />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/regions" element={<RegionsManagement />} />
            <Route path="/cities" element={<CityMapping />} />
            <Route path="/broadcasts" element={<Broadcasts />} />
            <Route path="/faqs" element={<FAQs />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;