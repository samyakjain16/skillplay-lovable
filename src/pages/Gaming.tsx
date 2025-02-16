
import { Navigation } from "@/components/Navigation";
import { WalletOverview } from "@/components/gaming/WalletOverview";
import { AvailableContests } from "@/components/gaming/AvailableContests";
import { MyContests } from "@/components/gaming/MyContests";
import { BottomNav } from "@/components/gaming/BottomNav";
import { AuthGuard } from "@/components/AuthGuard";
import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type TabType = "available" | "my-contests" | "create";

const Gaming = () => {
  const [activeTab, setActiveTab] = useState<TabType>("available");
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 pb-16">
        <Navigation />
        <div className="fixed top-16 left-0 right-0 bg-white border-b border-gray-200 z-40">
          <div className="container mx-auto px-4 py-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Balance:</span>
              <span className="font-semibold">${profile?.wallet_balance || 0}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => navigate('/account-settings')}
            >
              <Settings className="h-4 w-4" />
              Account
            </Button>
          </div>
        </div>
        <main className="container mx-auto px-4 pt-32">
          {activeTab === "available" && <AvailableContests />}
          {activeTab === "my-contests" && <MyContests />}
          {activeTab === "create" && (
            <div className="text-center py-8">
              <h2 className="text-2xl font-semibold">Create Contest</h2>
              <p className="text-gray-600 mt-2">Coming soon...</p>
            </div>
          )}
        </main>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </AuthGuard>
  );
};

export default Gaming;
