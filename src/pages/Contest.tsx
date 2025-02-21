import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { Timer, Trophy, MessageSquare, ArrowLeft } from "lucide-react";
import { GameContainer } from "@/components/gaming/GameContainer";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const Contest = () => {
  const { id } = useParams();
  const [totalScore, setTotalScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch contest details
  const { data: contest, isLoading: isLoadingContest } = useQuery({
    queryKey: ["contest", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Fetch contest progress
  const { data: contestProgress, isLoading: isLoadingProgress } = useQuery({
    queryKey: ["contest-progress", id],
    queryFn: async () => {
      if (!user || !id) return null;
      const { data, error } = await supabase
        .from('user_contests')
        .select('*')
        .eq('contest_id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id
  });

  // Check if contest is accessible
  useEffect(() => {
    if (!contest || !user) return;

    const now = new Date();
    const endTime = new Date(contest.end_time);
    
    // Redirect to leaderboard if contest is completed or ended
    if (contest.status === 'completed' || now > endTime) {
      navigate(`/contest/${id}/leaderboard`, { replace: true });
      return;
    }

    // Set initial states from contest progress
    if (contestProgress) {
      setTotalScore(contestProgress.score || 0);
      setIsCompleted(contestProgress.status === 'completed');
    }
  }, [contest, contestProgress, id, navigate, user]);

  const handleGameComplete = async (score: number, isFinalGame: boolean) => {
    if (!user || !id || !contest) return;
    
    try {
      const newTotalScore = totalScore + score;
      setTotalScore(newTotalScore);
      
      if (isFinalGame) {
        setIsCompleted(true);

        // Update user_contests with final state
        const { error: updateError } = await supabase
          .from('user_contests')
          .update({ 
            status: 'completed',
            score: newTotalScore,
            current_game_index: contest.series_count - 1, // Set to last game
            current_game_score: score,
            completed_at: new Date().toISOString()
          })
          .eq('contest_id', id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        // Show completion message
        toast({
          title: "Contest Completed!",
          description: `Your final score is ${newTotalScore}. Results will be available when the contest ends.`,
        });

        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ["contest-progress"] });
        queryClient.invalidateQueries({ queryKey: ["my-contests"] });
      }
    } catch (error) {
      console.error('Error updating contest progress:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update contest progress. Please try again."
      });
    }
  };

  const handleReturnToGaming = () => {
    navigate('/gaming');
  };

  if (isLoadingContest || isLoadingProgress) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Contest Not Found</h1>
            <Button onClick={handleReturnToGaming}>Return to Gaming</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                onClick={handleReturnToGaming}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Gaming
              </Button>
              <h1 className="text-3xl font-bold">
                {isCompleted ? "Contest Completed" : "Contest in Progress"}
              </h1>
              <p className="text-muted-foreground mt-1">{contest.title}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              {isCompleted ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-4">Congratulations!</h2>
                    <p className="text-lg mb-6">You've completed all games in this contest.</p>
                    <p className="text-xl font-semibold mb-8">Final Score: {totalScore}</p>
                    <Button onClick={handleReturnToGaming}>
                      Return to Gaming
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <GameContainer 
                  contestId={id}
                  onGameComplete={handleGameComplete}
                  initialProgress={contestProgress}
                />
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Current Score</h3>
                  </div>
                  <p className="text-2xl font-bold">{totalScore}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Game Information</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p>• Each game lasts 30 seconds</p>
                    <p>• Total games: {contest.series_count}</p>
                    <p>• Points are awarded based on speed and accuracy</p>
                    <p>• Complete all games to finish the contest</p>
                  </div>
                </CardContent>
              </Card>

              {contest.prize_pool > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Prize Pool</h3>
                    </div>
                    <p className="text-2xl font-bold">${contest.prize_pool}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Distribution: {contest.prize_distribution_type}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contest;