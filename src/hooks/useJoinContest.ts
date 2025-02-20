import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { User } from "@supabase/supabase-js";
import { useRef, useEffect } from "react";

// Type definitions
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

interface JoinContestResponse {
  success: boolean;
  error?: string;
}

// Error codes mapping
const ERROR_CODES = {
  DUPLICATE_KEY: '23505',
  CONTEST_FULL: 'CONTEST_FULL',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE'
} as const;

// Query keys for cache management
const QUERY_KEYS = {
  JOINED_CONTESTS: 'joined-contests',
  AVAILABLE_CONTESTS: 'available-contests',
  MY_CONTESTS: 'my-contests',
  PROFILE: 'profile'
} as const;

export const useJoinContest = (user: User | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Refs for tracking component mount state and ongoing operations
  const isMounted = useRef(true);
  const activeRequests = useRef(new Set<string>());

  // Cleanup effect
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
      activeRequests.current.clear();
    };
  }, []);

  return useMutation({
    mutationFn: async (contestId: string): Promise<JoinContestResponse> => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      if (!contestId) {
        throw new Error("Contest ID is required");
      }

      // Check if already processing this contest
      const requestKey = `${contestId}-${Date.now()}`;
      if (activeRequests.current.has(contestId)) {
        throw new Error("Join request already in progress");
      }

      try {
        activeRequests.current.add(contestId);

        // First check if already joined
        const { data: existingJoin } = await supabase
          .from('contest_participants')
          .select('id')
          .match({ user_id: user.id, contest_id: contestId })
          .single();

        if (existingJoin) {
          throw new Error("You have already joined this contest");
        }

        // Check contest status
        const { data: contestData } = await supabase
          .from('contests')
          .select('current_participants, max_participants, status')
          .eq('id', contestId)
          .single();

        if (!contestData) {
          throw new Error("Contest not found");
        }

        if (contestData.status !== 'open') {
          throw new Error("Contest is not open for joining");
        }

        if (contestData.current_participants >= contestData.max_participants) {
          throw new Error("Contest is full");
        }

        // Attempt to join contest
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

      } finally {
        if (isMounted.current) {
          activeRequests.current.delete(contestId);
        }
      }
    },

    onMutate: async (contestId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: [QUERY_KEYS.AVAILABLE_CONTESTS, QUERY_KEYS.MY_CONTESTS] 
      });
    },

    onSuccess: () => {
      if (!isMounted.current) return;

      toast({
        title: "Success!",
        description: "You have successfully joined the contest.",
      });
      
      // Invalidate and refetch relevant queries
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.JOINED_CONTESTS] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AVAILABLE_CONTESTS] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_CONTESTS] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROFILE] })
      ]);
    },

    onError: (error: any) => {
      if (!isMounted.current) return;

      let description = "Failed to join contest";

      // Handle specific error cases
      if (error?.code === ERROR_CODES.DUPLICATE_KEY || 
          error?.message?.includes('already joined')) {
        description = "You have already joined this contest";
      } 
      else if (error?.message?.includes('Contest is full') || 
               error?.code === ERROR_CODES.CONTEST_FULL) {
        description = "This contest is full";
      } 
      else if (error?.message?.includes('Insufficient balance') || 
               error?.code === ERROR_CODES.INSUFFICIENT_BALANCE) {
        description = "Insufficient wallet balance";
      }
      else if (error?.message?.includes('in progress')) {
        // Silently handle duplicate requests
        return;
      }
      else if (error?.message) {
        description = error.message;
      }

      toast({
        variant: "destructive",
        title: "Error",
        description
      });

      // Refresh relevant queries
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.AVAILABLE_CONTESTS, QUERY_KEYS.MY_CONTESTS] 
      });
    },

    // Retry configuration
    retry: (failureCount, error: any) => {
      // Don't retry for specific errors
      if (error?.code === ERROR_CODES.DUPLICATE_KEY || 
          error?.message?.includes('already joined') ||
          error?.message?.includes('Contest is full') ||
          error?.message?.includes('Insufficient balance')) {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    }
  });
};