
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

  return useMutation({
    mutationFn: async (contestId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Call the join_contest function directly - it handles all validation
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
