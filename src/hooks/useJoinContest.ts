
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

      // Let the database function handle all validations
      const { data, error } = await supabase.rpc<'join_contest', JoinContestFunction>(
        'join_contest',
        {
          p_user_id: user.id,
          p_contest_id: contestId
        }
      );

      // If there's an error from the database function, throw it
      if (error) {
        console.error("Join contest error:", error);
        throw new Error(error.message);
      }

      // If the operation wasn't successful, throw the error message
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
      
      // Invalidate and refetch all relevant queries
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["joined-contests"] }),
        queryClient.invalidateQueries({ queryKey: ["available-contests"] }),
        queryClient.invalidateQueries({ queryKey: ["my-contests"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] })
      ]).then(() => {
        // Force refetch critical queries
        return Promise.all([
          queryClient.refetchQueries({ queryKey: ["joined-contests"] }),
          queryClient.refetchQueries({ queryKey: ["my-contests"] })
        ]);
      });
    },
    onError: (error: Error) => {
      // Show error toast only for actual errors
      if (error.message.includes('duplicate key') || error.message.includes('Already joined')) {
        toast({
          variant: "destructive",
          title: "Already Joined",
          description: "You have already joined this contest.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      }
      
      // Ensure UI is in sync
      queryClient.invalidateQueries({ queryKey: ["available-contests"] });
      queryClient.invalidateQueries({ queryKey: ["my-contests"] });
    },
  });
};
