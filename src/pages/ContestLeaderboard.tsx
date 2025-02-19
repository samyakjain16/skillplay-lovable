
import { useParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { calculatePrizeDistribution } from "@/services/scoring/prizeDistribution";
import { useToast } from "@/components/ui/use-toast";
import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";

// Define types for our leaderboard data
interface LeaderboardEntry {
  user_id: string;
  total_score: number;
  games_completed: number;
  average_time: number;
  rank: number;
  username?: string | null;
  prize?: number;
}

const ContestLeaderboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: contest } = useQuery({
    queryKey: ["contest", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching contest:', error);
        throw error;
      }
      return data;
    }
  });

  const { data: leaderboard, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["contest-leaderboard", id],
    queryFn: async () => {
      if (!contest || !id) return [];

      try {
        // Get leaderboard data using the database function
        const { data: rankings, error: rankingsError } = await supabase
          .rpc('get_contest_leaderboard', { contest_id: id });

        if (rankingsError) {
          console.error('Error fetching rankings:', rankingsError);
          throw rankingsError;
        }

        if (!rankings || rankings.length === 0) {
          return [];
        }

        // Get usernames for all participants
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', rankings.map(r => r.user_id));

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }

        const usernameMap = new Map(
          profiles?.map(p => [p.id, p.username]) || []
        );

        // Calculate prize distribution if contest is completed
        if (contest.status === 'completed' && contest.prize_pool > 0) {
          try {
            const prizes = await calculatePrizeDistribution(
              id,
              contest.prize_pool,
              contest.prize_distribution_type
            );

            // Combine all data
            return rankings.map(rank => ({
              ...rank,
              username: usernameMap.get(rank.user_id) || 'Anonymous',
              prize: prizes.get(rank.user_id) || 0
            }));
          } catch (error) {
            console.error('Error calculating prizes:', error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to calculate prize distribution"
            });
          }
        }

        // Return rankings with usernames but no prizes
        return rankings.map(rank => ({
          ...rank,
          username: usernameMap.get(rank.user_id) || 'Anonymous'
        }));
      } catch (error) {
        console.error('Error in leaderboard query:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load leaderboard"
        });
        return [];
      }
    },
    enabled: !!contest && !!id,
    refetchInterval: (contest?.status === 'in_progress') ? 5000 : false
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8 p-6">
            <h1 className="text-3xl font-bold mb-2">
              Contest Leaderboard
            </h1>
            {contest && (
              <div>
                <p className="text-muted-foreground">{contest.title}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Status: <span className="capitalize">{contest.status}</span>
                </p>
                {contest.status === 'completed' && contest.prize_pool > 0 && (
                  <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                    <div className="flex items-center gap-2 text-primary">
                      <Trophy className="h-5 w-5" />
                      <span className="font-semibold">Total Prize Pool: ${contest.prize_pool}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : leaderboard && leaderboard.length > 0 ? (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Rank</th>
                      <th className="text-left p-4">Player</th>
                      <th className="text-right p-4">Score</th>
                      <th className="text-right p-4">Games</th>
                      <th className="text-right p-4">Avg Time</th>
                      {contest?.status === 'completed' && contest.prize_pool > 0 && (
                        <th className="text-right p-4">Prize</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry) => (
                      <tr key={entry.user_id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-4">#{entry.rank}</td>
                        <td className="p-4">
                          {entry.username || 'Anonymous'}
                        </td>
                        <td className="p-4 text-right">
                          {entry.total_score.toLocaleString()}
                        </td>
                        <td className="p-4 text-right">
                          {entry.games_completed}
                        </td>
                        <td className="p-4 text-right">
                          {entry.average_time.toFixed(1)}s
                        </td>
                        {contest?.status === 'completed' && contest.prize_pool > 0 && (
                          <td className="p-4 text-right font-medium">
                            {entry.prize ? `$${entry.prize.toFixed(2)}` : '-'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No participants yet</p>
            </Card>
          )}
          
          <div className="mt-8 flex justify-center">
            <Button
              onClick={() => navigate('/gaming')}
              className="w-full max-w-md"
            >
              Return to Gaming
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ContestLeaderboard;
