import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Gaming from "./pages/Gaming";
import Contest from "./pages/Contest";
import ContestLeaderboard from "./pages/ContestLeaderboard"; // Add this import
import Sponsorships from "./pages/Sponsorships";
import Wallet from "./pages/Wallet";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import AccountSettings from "./pages/AccountSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/gaming" element={<Gaming />} />
          <Route path="/contest/:id" element={<Contest />} />
          <Route path="/contest/:id/leaderboard" element={<ContestLeaderboard />} /> {/* Add this route */}
          <Route path="/sponsorships" element={<Sponsorships />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/account-settings" element={<AccountSettings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;