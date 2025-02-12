
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Trophy, Users, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

export const AvailableContests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contests, isLoading } = useQuery({
    queryKey: ["available-contests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .eq("status", "upcoming")
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

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
  });

  const joinContestMutation = useMutation({
    mutationFn: async (contestId: string) => {
      // Start a transaction
      const { data: contest, error: contestError } = await supabase
        .from("contests")
        .select("entry_fee")
        .eq("id", contestId)
        .single();

      if (contestError) throw contestError;

      // Check wallet balance
      if (profile && profile.wallet_balance < contest.entry_fee) {
        throw new Error("Insufficient balance");
      }

      // Create participation record
      const { error: participationError } = await supabase
        .from("user_contests")
        .insert([{ user_id: user?.id, contest_id: contestId }]);

      if (participationError) throw participationError;

      // Deduct entry fee
      const { error: walletError } = await supabase.from("wallet_transactions").insert([
        {
          user_id: user?.id,
          amount: -contest.entry_fee,
          type: "contest_entry",
          reference_id: contestId,
        },
      ]);

      if (walletError) throw walletError;

      // Update user's wallet balance
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ wallet_balance: profile!.wallet_balance - contest.entry_fee })
        .eq("id", user?.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You have successfully joined the contest.",
      });
      queryClient.invalidateQueries({ queryKey: ["available-contests"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message === "Insufficient balance" 
          ? "Insufficient balance. Please add funds to your wallet."
          : "Failed to join contest. Please try again.",
      });
    },
  });

  if (isLoading) {
    return <div>Loading contests...</div>;
  }

  return (
    <div className="space-y-4">
      {contests?.map((contest) => (
        <Card key={contest.id}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{contest.title}</h3>
                <p className="text-sm text-muted-foreground">{contest.description}</p>
              </div>
              <div className="text-right">
                <p className="text-primary font-semibold">Entry: ${contest.entry_fee}</p>
                <p className="text-sm text-muted-foreground">Prize: ${contest.prize_pool}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                <span>${contest.prize_pool} Prize Pool</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{contest.current_participants}/{contest.max_participants} Players</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{format(new Date(contest.start_time), 'MMM d, h:mm a')}</span>
              </div>
            </div>
            <Button 
              className="w-full"
              onClick={() => joinContestMutation.mutate(contest.id)}
              disabled={joinContestMutation.isPending}
            >
              Join Contest
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
