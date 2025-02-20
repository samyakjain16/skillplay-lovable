
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

      const { data, error } = await supabase.rpc<'join_contest', JoinContestFunction>(
        'join_contest',
        {
          p_user_id: user.id,
          p_contest_id: contestId
        }
      );

      // Handle all possible error cases
      if (error) {
        console.error("Join contest error:", error);
        // Don't transform the error, let the database error flow through
        throw error;
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
      
      // Invalidate queries first
      return queryClient.invalidateQueries({ 
        queryKey: ["joined-contests", "available-contests", "my-contests", "profile"]
      });
    },
    onError: (error: any) => {
      let title = "Error";
      let description = "Failed to join contest";

      // Handle specific database error cases
      if (error?.code === '23505' || error?.message?.includes('duplicate')) {
        description = "You have already joined this contest";
      } else if (error?.message?.includes('Contest is full')) {
        description = "This contest is full";
      } else if (error?.message?.includes('Insufficient balance')) {
        description = "Insufficient wallet balance";
      } else if (error?.message) {
        description = error.message;
      }

      toast({
        variant: "destructive",
        title,
        description,
      });

      // Refresh the UI state
      queryClient.invalidateQueries({ 
        queryKey: ["available-contests", "my-contests"] 
      });
    },
  });
};
