
import { useQuery } from "@tanstack/react-query";
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
  start_time: string | null;
  end_time: string | null;
  prize_pool: number;
  entry_fee: number;
  prize_distribution_type: string;
  contest_type: string;
};

export const AvailableContests = () => {
  const { user } = useAuth();
  const joinContestMutation = useJoinContest(user);

  // Set up real-time subscription
  useContestRealtime();

  // Query to get user's joined contests - crucial for filtering
  const { data: joinedContests } = useQuery({
    queryKey: ["joined-contests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("contest_participants")  // Changed from user_contests to contest_participants
        .select("contest_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching joined contests:", error);
        throw error;
      }
      return data.map(uc => uc.contest_id);
    },
    enabled: !!user,
  });

  // Query to get available contests
  const { data: contests, isLoading } = useQuery({
    queryKey: ["available-contests"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .in("status", ["upcoming", "waiting_for_players"])
        .or(`end_time.gt.${now},end_time.is.null`)
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching available contests:", error);
        throw error;
      }
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading contests...</div>;
  }

  // Filter contests based on our criteria
  const availableContests = contests?.filter(contest => {
    const now = new Date();
    const endTime = contest.end_time ? new Date(contest.end_time) : null;
    const isJoined = joinedContests?.includes(contest.id) || false;
    const isFull = contest.current_participants >= contest.max_participants;
    
    // Show contests that:
    // 1. Haven't been joined by the user
    // 2. Haven't ended yet (or have no end time for fixed_participants)
    // 3. Aren't full
    return !isJoined && 
           (!endTime || endTime > now) && 
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
