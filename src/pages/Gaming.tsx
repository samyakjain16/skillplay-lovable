
import { Navigation } from "@/components/Navigation";
import { WalletOverview } from "@/components/gaming/WalletOverview";
import { AvailableContests } from "@/components/gaming/AvailableContests";
import { MyContests } from "@/components/gaming/MyContests";
import { BottomNav } from "@/components/gaming/BottomNav";
import { AuthGuard } from "@/components/AuthGuard";
import { useState } from "react";
import { Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

type TabType = "available" | "my-contests" | "create";

const Gaming = () => {
  const [activeTab, setActiveTab] = useState<TabType>("available");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Enhanced query configuration with better caching strategy
  const { data: profile, isLoading: isLoadingBalance } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        toast({
          variant: "destructive",
          title: "Error fetching balance",
          description: "Please try refreshing the page",
        });
        throw error;
      }
      return data;
    },
    enabled: !!user,
    staleTime: Infinity, // Keep data fresh indefinitely unless explicitly invalidated
    gcTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes
    initialData: () => {
      // Use existing cached data if available
      return queryClient.getQueryData(["profile", user?.id]);
    }
  });

  // Set up real-time subscription for wallet balance updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('wallet-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          // Update the cached wallet balance
          if (payload.new) {
            queryClient.setQueryData(["profile", user?.id], {
              wallet_balance: (payload.new as any).wallet_balance
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 pb-16">
        <Navigation />
        <div className="fixed top-16 left-0 right-0 bg-white border-b border-gray-200 z-40">
          <div className="container mx-auto px-4 py-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Balance:</span>
              {isLoadingBalance ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="font-semibold">${profile?.wallet_balance?.toFixed(2) || '0.00'}</span>
              )}
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
