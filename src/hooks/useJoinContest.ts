
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { User } from "@supabase/supabase-js";

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

      if (error) {
        console.error("Join contest error:", error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to join contest');
      }

      return { success: true };
    },
    onMutate: async (contestId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: ["joined-contests", "available-contests"] 
      });

      // Get the current joined contests
      const previousJoinedContests = queryClient.getQueryData(["joined-contests"]) || [];

      // Optimistically update joined contests
      queryClient.setQueryData(["joined-contests"], (old: string[] = []) => {
        return [...old, contestId];
      });

      return { previousJoinedContests };
    },
    onSuccess: (_, contestId) => {
      toast({
        title: "Success!",
        description: "You have successfully joined the contest.",
      });

      // Force refetch joined contests and available contests
      return Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: ["joined-contests"]
        }),
        queryClient.invalidateQueries({ 
          queryKey: ["available-contests"]
        }),
        queryClient.invalidateQueries({ 
          queryKey: ["my-contests"]
        })
      ]).then(() => {
        // Force immediate refetch
        return Promise.all([
          queryClient.refetchQueries({ 
            queryKey: ["joined-contests"]
          }),
          queryClient.refetchQueries({ 
            queryKey: ["available-contests"]
          }),
          queryClient.refetchQueries({ 
            queryKey: ["my-contests"]
          })
        ]);
      });
    },
    onError: (error: any, contestId, context) => {
      // Revert optimistic update
      if (context?.previousJoinedContests) {
        queryClient.setQueryData(["joined-contests"], context.previousJoinedContests);
      }

      let description = "Failed to join contest";

      if (error?.message?.includes('duplicate') || error?.message?.includes('Already joined')) {
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
        title: "Error",
        description
      });

      // Refresh queries to ensure UI is in sync
      queryClient.invalidateQueries({ 
        queryKey: ["available-contests"]
      });
      queryClient.invalidateQueries({ 
        queryKey: ["joined-contests"]
      });
    },
    // Don't retry on specific errors
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('duplicate') || 
          error?.message?.includes('Already joined') ||
          error?.message?.includes('Contest is full') ||
          error?.message?.includes('Insufficient balance')) {
        return false;
      }
      return failureCount < 2;
    }
  });
};
