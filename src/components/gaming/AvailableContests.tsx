
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ContestCard } from "./ContestCard";
import { useJoinContest } from "@/hooks/useJoinContest";
import { useContestRealtime } from "@/hooks/useContestRealtime";
import { type Contest } from "./ContestTypes";

export const AvailableContests = () => {
  const { user } = useAuth();
  const joinContestMutation = useJoinContest(user);

  // Set up real-time subscription
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

      if (error) {
        console.error("Error fetching joined contests:", error);
        throw error;
      }
      return data?.map(uc => uc.contest_id) ?? [];
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

      // Transform the data to ensure status is one of the allowed values
      return (data ?? []).map(contest => {
        const calculationStatus = contest.prize_calculation_status as Contest['prize_calculation_status'] || 'pending';
        return {
          ...contest,
          status: contest.status as Contest['status'],
          contest_type: contest.contest_type as Contest['contest_type'],
          prize_calculation_status: calculationStatus,
          // Ensure all required properties are present with correct types
          title: contest.title || '',
          description: contest.description || '',
          start_time: contest.start_time || '',
          end_time: contest.end_time || '',
          entry_fee: contest.entry_fee || 0,
          prize_pool: contest.prize_pool || 0,
          current_participants: contest.current_participants || 0,
          max_participants: contest.max_participants || 0,
          prize_distribution_type: contest.prize_distribution_type || '',
          series_count: contest.series_count || 0
        } satisfies Contest;
      });
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
    
    return !isJoined && 
           (!endTime || endTime > now) && 
           !isFull;
  }) || [];

  const handleJoinContest = async (contestId: string) => {
    await joinContestMutation.mutateAsync(contestId);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {availableContests.map((contest) => (
        <ContestCard
          key={contest.id}
          contest={contest}
          onJoin={handleJoinContest}
          isJoining={joinContestMutation.isPending}
        />
      ))}
    </div>
  );
};
