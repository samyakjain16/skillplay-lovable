import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ContestPageHeader } from "@/components/contest/ContestPageHeader";
import { ContestGameSection } from "@/components/contest/ContestGameSection";
import { ContestSidebar } from "@/components/contest/ContestSidebar";
import { Button } from "@/components/ui/button";

const Contest = () => {
  const { id } = useParams();
  const [totalScore, setTotalScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const handleGameComplete = async (score: number, isFinalGame: boolean) => {
    if (!user || !id || !contest) return;
    
    try {
      const newTotalScore = totalScore + score;
      setTotalScore(newTotalScore);
      
      if (isFinalGame) {
        setIsCompleted(true);

        const { error: updateError } = await supabase
          .from('user_contests')
          .update({ 
            status: 'completed',
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
          <ContestPageHeader 
            title={contest.title}
            isCompleted={isCompleted}
            onReturn={handleReturnToGaming}
          />

          <div className="grid md:grid-cols-3 gap-6">
            <ContestGameSection 
              isCompleted={isCompleted}
              totalScore={totalScore}
              contestId={id!}
              onGameComplete={handleGameComplete}
              contestProgress={contestProgress}
              onReturn={handleReturnToGaming}
            />
            
            <ContestSidebar 
              totalScore={totalScore}
              contest={contest}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contest;
