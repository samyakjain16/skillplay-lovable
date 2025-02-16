
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { User } from "@supabase/supabase-js";

export const useJoinContest = (user: User | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contestId: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      // Start a transaction using RPC call
      const { data: contest, error: contestError } = await supabase
        .from("contests")
        .select("entry_fee, current_participants, max_participants")
        .eq("id", contestId)
        .single();

      if (contestError) throw contestError;
      
      if (contest.current_participants >= contest.max_participants) {
        throw new Error("Contest is full");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (profile.wallet_balance < contest.entry_fee) {
        throw new Error("Insufficient balance");
      }

      // Update contest participants count first
      const { error: updateError } = await supabase
        .from("contests")
        .update({ current_participants: contest.current_participants + 1 })
        .eq("id", contestId);

      if (updateError) throw updateError;

      // Create participation record
      const { error: participationError } = await supabase
        .from("user_contests")
        .insert([{ user_id: user.id, contest_id: contestId }]);

      if (participationError) {
        // Revert the participants count if participation record fails
        await supabase
          .from("contests")
          .update({ current_participants: contest.current_participants })
          .eq("id", contestId);

        if (participationError.code === '23505') {
          throw new Error("You have already joined this contest");
        }
        throw participationError;
      }

      // Create wallet transaction and update balance
      const { error: transactionError } = await supabase
        .from("wallet_transactions")
        .insert([{
          user_id: user.id,
          amount: -contest.entry_fee,
          type: "contest_entry",
          reference_id: contestId,
        }]);

      if (transactionError) throw transactionError;

      // Update user's wallet balance
      const { error: walletError } = await supabase
        .from("profiles")
        .update({ wallet_balance: profile.wallet_balance - contest.entry_fee })
        .eq("id", user.id);

      if (walletError) throw walletError;

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You have successfully joined the contest.",
      });
      queryClient.invalidateQueries({ queryKey: ["available-contests"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["joined-contests"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      queryClient.invalidateQueries({ queryKey: ["available-contests"] });
      queryClient.invalidateQueries({ queryKey: ["joined-contests"] });
    },
  });
};
