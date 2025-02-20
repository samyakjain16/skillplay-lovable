
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const WalletOverview = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
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

  // Set up real-time subscription for wallet updates
  useEffect(() => {
    if (!user?.id) return;

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
          queryClient.setQueryData(["profile", user.id], payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Wallet Balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-4">
          ${profile?.wallet_balance?.toFixed(2) || '0.00'}
        </div>
        <div className="space-y-2">
          <Button className="w-full gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Deposit
          </Button>
          <Button variant="outline" className="w-full gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            Withdraw
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
