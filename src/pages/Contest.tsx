
import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { useNavigate, useParams } from "react-router-dom";
import { GameContainer } from "@/components/gaming/GameContainer";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ContestLoadingState } from "@/components/gaming/contest/ContestLoadingState";
import { ContestNotFound } from "@/components/gaming/contest/ContestNotFound";
import { ContestHeader } from "@/components/gaming/contest/ContestHeader";
import { ContestCompletionState } from "@/components/gaming/contest/ContestCompletionState";

interface ContestProgress {
  status: "completed" | "active";
  score: number;
  current_game_index: number;
  current_game_start_time: string | null;
  current_game_score: number;
  completed_at?: string;
}

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
      return data as ContestProgress;
    },
    enabled: !!user && !!id
  });

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
            status: 'completed' as const,
            score: newTotalScore,
            current_game_index: contest.series_count - 1,
            current_game_score: score,
            completed_at: new Date().toISOString()
          })
          .eq('contest_id', id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        toast({
          title: "Contest Completed!",
          description: `Your final score is ${newTotalScore}. Results will be available when the contest ends.`,
        });

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

  useEffect(() => {
    if (!contest || !user) return;

    const now = new Date();
    const endTime = new Date(contest.end_time);
    
    if (contest.status === 'completed' || now > endTime) {
      navigate(`/contest/${id}/leaderboard`, { replace: true });
      return;
    }

    if (contestProgress) {
      setTotalScore(contestProgress.score || 0);
      setIsCompleted(contestProgress.status === 'completed');
    }
  }, [contest, contestProgress, id, navigate, user]);

  if (isLoadingContest || isLoadingProgress) {
    return <ContestLoadingState />;
  }

  if (!contest) {
    return <ContestNotFound onReturnToGaming={handleReturnToGaming} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <ContestHeader 
            isCompleted={isCompleted} 
            title={contest.title} 
            onReturnToGaming={handleReturnToGaming}
          />

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              {isCompleted ? (
                <ContestCompletionState 
                  totalScore={totalScore}
                  onReturnToGaming={handleReturnToGaming}
                />
              ) : (
                <GameContainer 
                  contestId={id}
                  onGameComplete={handleGameComplete}
                  initialProgress={contestProgress}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contest;
