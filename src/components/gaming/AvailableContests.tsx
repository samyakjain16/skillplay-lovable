
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ContestCard } from "./ContestCard";
import { useJoinContest } from "@/hooks/useJoinContest";
import { useContestRealtime } from "@/hooks/useContestRealtime";

type Contest = {
  id: string;
  title: string;
  description: string;
  series_count: number;
  max_participants: number;
  current_participants: number;
  status: string;
  start_time: string;
  end_time: string;
  prize_pool: number;
  entry_fee: number;
  prize_distribution_type: string;
};

export const AvailableContests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const joinContestMutation = useJoinContest(user);

  // Set up real-time subscription without passing any arguments
  useContestRealtime();

  // Query to get user's joined contests
  const { data: joinedContests } = useQuery({
    queryKey: ["joined-contests"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_contests")
        .select("contest_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map(uc => uc.contest_id);
    },
    enabled: !!user
  });

  const { data: contests, isLoading } = useQuery({
    queryKey: ["available-contests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading contests...</div>;
  }

  // Filter out contests that have been joined by the user
  const availableContests = contests?.filter(contest => {
    const isJoined = joinedContests?.includes(contest.id);
    const isFull = contest.current_participants >= contest.max_participants;
    
    // Show contests that:
    // 1. Haven't been joined by the user
    // 2. Aren't full (unless already joined)
    return !isJoined && !isFull;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {availableContests?.map((contest) => (
        <ContestCard
          key={contest.id}
          contest={contest}
          onJoin={(contestId) => joinContestMutation.mutate(contestId)}
          isJoining={joinContestMutation.isPending}
        />
      ))}
    </div>
  );
};
