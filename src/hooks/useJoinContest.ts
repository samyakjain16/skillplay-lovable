
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { User } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";

type JoinContestFunction = {
  Args: {
    p_user_id: string;
    p_contest_id: string;
  };
  Returns: {
    success: boolean;
    error?: string;
  };
};

export const useJoinContest = (user: User | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const joinInProgress = false;

  return useMutation({
    mutationFn: async (contestId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      // First check if user has already joined
      const { data: existingParticipation, error: checkError } = await supabase
        .from("user_contests")
        .select("id")
        .eq("user_id", user.id)
        .eq("contest_id", contestId)
        .single();

      if (existingParticipation) {
        throw new Error("You have already joined this contest");
      }

      if (checkError && checkError.code !== "PGRST116") { // PGRST116 means no rows returned
        console.error("Check participation error:", checkError);
        throw new Error("Failed to check contest participation");
      }

      // Then check if contest is full
      const { data: contest, error: contestError } = await supabase
        .from("contests")
        .select("current_participants, max_participants")
        .eq("id", contestId)
        .single();

      if (contestError) {
        console.error("Contest fetch error:", contestError);
        throw new Error("Failed to check contest capacity");
      }

      if (contest.current_participants >= contest.max_participants) {
        throw new Error("Contest is full");
      }

      // If all checks pass, call the join_contest function
      const { data, error } = await supabase.rpc<'join_contest', JoinContestFunction>(
        'join_contest',
        {
          p_user_id: user.id,
          p_contest_id: contestId
        }
      );

      if (error) {
        console.error("Join contest error:", error);
        // Handle specific error cases from the database function
        if (error.message.includes('duplicate key') || error.message.includes('Already joined')) {
          throw new Error("You have already joined this contest");
        } else if (error.message.includes('Contest is full')) {
          throw new Error("Contest is full");
        } else if (error.message.includes('Contest not found')) {
          throw new Error("Contest not found");
        }
        throw new Error("Failed to join contest");
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to join contest');
      }

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You have successfully joined the contest.",
      });
      
      // Invalidate all relevant queries first
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["joined-contests"] }),
        queryClient.invalidateQueries({ queryKey: ["available-contests"] }),
        queryClient.invalidateQueries({ queryKey: ["my-contests"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] })
      ]).then(() => {
        // Then force refetch of critical queries
        return Promise.all([
          queryClient.refetchQueries({ queryKey: ["joined-contests"] }),
          queryClient.refetchQueries({ queryKey: ["my-contests"] })
        ]);
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      // Invalidate queries to ensure UI is in sync
      queryClient.invalidateQueries({ queryKey: ["available-contests"] });
      queryClient.invalidateQueries({ queryKey: ["my-contests"] });
    },
  });
};
