
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
    queryKey: ["joined-contests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_contests")
        .select("contest_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map(uc => uc.contest_id);
    },
    enabled: !!user,
    staleTime: 0, // Consider data always stale to force refresh
  });

  const { data: contests, isLoading } = useQuery({
    queryKey: ["available-contests"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .eq("status", "upcoming")
        .gt("start_time", now) // Only get contests that haven't started yet
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  if (isLoading) {
    return <div>Loading contests...</div>;
  }

  // Filter contests based on our criteria
  const availableContests = contests?.filter(contest => {
    const now = new Date();
    const startTime = new Date(contest.start_time);
    const isJoined = joinedContests?.includes(contest.id) || false;
    const isFull = contest.current_participants >= contest.max_participants;
    
    // Show contests that:
    // 1. Haven't been joined by the user
    // 2. Haven't started yet (double check even though we filtered in the query)
    // 3. Aren't full
    return !isJoined && 
           startTime > now && 
           !isFull;
  }) || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {availableContests.map((contest) => (
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
