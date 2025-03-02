import { useParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { calculatePrizeDistribution, getPrizeDistributionDetails } from "@/services/scoring/prizeDistribution";
import { useToast } from "@/components/ui/use-toast";
import { Trophy, Clock, Award, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { LeaderboardEntry } from "@/services/scoring/types";

const ContestLeaderboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [prizeMap, setPrizeMap] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (contest?.status === 'in_progress') {
      timer = setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 10000);
    }
    return () => clearTimeout(timer);
  }, [refreshKey]);

  const { data: contest } = useQuery({
    queryKey: ["contest", id, refreshKey],
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

  useEffect(() => {
    const fetchPrizes = async () => {
      if (contest?.status === 'completed' && contest.prize_pool > 0 && id) {
        try {
          const prizes = await calculatePrizeDistribution(
            id,
            contest.prize_pool,
            contest.prize_distribution_type
          );
          setPrizeMap(prizes);
        } catch (error) {
          console.error('Error fetching prize distribution:', error);
        }
      }
    };
    
    fetchPrizes();
  }, [contest, id]);

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["contest-leaderboard", id, refreshKey],
    queryFn: async () => {
      if (!contest || !id) return [];

      try {
        const { data: rankings, error: rankingsError } = await supabase
          .rpc('get_contest_leaderboard', { contest_id: id });

        if (rankingsError) {
          console.error('Error fetching rankings:', rankingsError);
          throw rankingsError;
        }

        if (!rankings || rankings.length === 0) {
          return [];
        }

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
    refetchInterval: (contest?.status === 'in_progress') ? 10000 : false
  });

  const getStatusIndicator = () => {
    if (!contest) return null;
    
    switch(contest.status) {
      case 'in_progress':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            <Clock className="h-4 w-4" />
            <span>Contest in progress</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>Contest completed</span>
          </div>
        );
      case 'waiting_for_players':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
            <Clock className="h-4 w-4" />
            <span>Waiting for players</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
            <span className="capitalize">{contest.status}</span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <h1 className="text-3xl font-bold">
                Contest Leaderboard
              </h1>
              {getStatusIndicator()}
            </div>
            
            {contest && (
              <div>
                <p className="text-muted-foreground">{contest.title}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {contest.series_count} games • {contest.current_participants} participants
                </p>
                
                {contest.prize_pool > 0 && (
                  <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                    <div className="flex items-center gap-2 text-primary">
                      <Trophy className="h-5 w-5" />
                      <span className="font-semibold">Total Prize Pool: ${contest.prize_pool}</span>
                    </div>
                    
                    {contest.status === 'completed' && contest.prize_calculation_status === 'in_progress' && (
                      <div className="mt-2 text-sm text-amber-600">
                        Finalizing prize distribution...
                      </div>
                    )}
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
                      <th className="text-right p-4 hidden md:table-cell">Games</th>
                      <th className="text-right p-4 hidden md:table-cell">Avg. Time</th>
                      {contest?.prize_pool > 0 && (
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
                        <td className="p-4 text-right font-medium">
                          {entry.total_score.toLocaleString()}
                        </td>
                        <td className="p-4 text-right hidden md:table-cell">
                          {entry.games_completed || 0}/{contest?.series_count || 3}
                        </td>
                        <td className="p-4 text-right hidden md:table-cell">
                          {entry.average_time ? `${Math.round(entry.average_time)}s` : '-'}
                        </td>
                        {contest?.prize_pool > 0 && (
                          <td className="p-4 text-right font-medium">
                            {contest.status === 'completed' 
                              ? (prizeMap.get(entry.user_id) 
                                ? `$${prizeMap.get(entry.user_id)?.toFixed(2)}` 
                                : '-') 
                              : 'Pending'}
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
          
          <div className="mt-8 flex justify-center gap-4">
            <Button
              onClick={() => setRefreshKey(prev => prev + 1)}
              variant="outline"
              className="w-1/3 max-w-[160px]"
            >
              Refresh
            </Button>
            <Button
              onClick={() => navigate('/gaming')}
              className="w-2/3 max-w-md"
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
