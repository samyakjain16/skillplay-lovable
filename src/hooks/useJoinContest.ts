
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
      
      // First check if user has already joined
      const { data: existingParticipation } = await supabase
        .from("user_contests")
        .select("id")
        .eq("user_id", user.id)
        .eq("contest_id", contestId)
        .single();

      if (existingParticipation) {
        throw new Error("You have already joined this contest");
      }

      // Get contest details with FOR UPDATE to lock the row
      const { data: contest, error: contestError } = await supabase
        .from("contests")
        .select("entry_fee, current_participants, max_participants")
        .eq("id", contestId)
        .single();

      if (contestError) throw contestError;
      if (!contest) throw new Error("Contest not found");
      
      // Check if contest is full
      if (contest.current_participants >= contest.max_participants) {
        throw new Error("Contest is full");
      }

      // Check wallet balance
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile) throw new Error("Profile not found");
      if (profile.wallet_balance < contest.entry_fee) {
        throw new Error("Insufficient balance");
      }

      // Create participation record first
      const { error: participationError } = await supabase
        .from("user_contests")
        .insert([{ 
          user_id: user.id, 
          contest_id: contestId,
          status: 'active'
        }]);

      if (participationError) {
        throw participationError;
      }

      // Update contest participants count
      const { error: updateError } = await supabase
        .from("contests")
        .update({ 
          current_participants: contest.current_participants + 1 
        })
        .eq("id", contestId)
        .select();

      if (updateError) {
        // Rollback participation if update fails
        await supabase
          .from("user_contests")
          .delete()
          .eq("user_id", user.id)
          .eq("contest_id", contestId);
          
        throw updateError;
      }

      // Create wallet transaction
      const { error: transactionError } = await supabase
        .from("wallet_transactions")
        .insert([{
          user_id: user.id,
          amount: -contest.entry_fee,
          type: "contest_entry",
          reference_id: contestId,
        }]);

      if (transactionError) {
        // Rollback everything if transaction fails
        await supabase
          .from("user_contests")
          .delete()
          .eq("user_id", user.id)
          .eq("contest_id", contestId);
          
        await supabase
          .from("contests")
          .update({ current_participants: contest.current_participants })
          .eq("id", contestId);
          
        throw transactionError;
      }

      // Update user's wallet balance
      const { error: walletError } = await supabase
        .from("profiles")
        .update({ wallet_balance: profile.wallet_balance - contest.entry_fee })
        .eq("id", user.id);

      if (walletError) {
        // Rollback everything if wallet update fails
        await supabase
          .from("user_contests")
          .delete()
          .eq("user_id", user.id)
          .eq("contest_id", contestId);
          
        await supabase
          .from("contests")
          .update({ current_participants: contest.current_participants })
          .eq("id", contestId);
          
        await supabase
          .from("wallet_transactions")
          .delete()
          .eq("user_id", user.id)
          .eq("reference_id", contestId);
          
        throw walletError;
      }

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You have successfully joined the contest.",
      });
      // Invalidate all relevant queries to update UI
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
      // Invalidate queries to ensure UI is in sync with server state
      queryClient.invalidateQueries({ queryKey: ["available-contests"] });
      queryClient.invalidateQueries({ queryKey: ["joined-contests"] });
    },
  });
};
