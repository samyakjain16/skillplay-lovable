
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { Timer, Trophy, MessageSquare } from "lucide-react";
import { GameContainer } from "@/components/gaming/GameContainer";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

const Contest = () => {
  const { id } = useParams();
  const [totalScore, setTotalScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch contest progress
  const { data: contestProgress } = useQuery({
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

  // Set initial state from contest progress
  useEffect(() => {
    if (contestProgress) {
      setTotalScore(contestProgress.score || 0);
      setIsCompleted(contestProgress.status === 'completed');
    }
  }, [contestProgress]);

  const handleGameComplete = async (score: number, isFinalGame: boolean) => {
    if (!user || !id) return;
    
    const newTotalScore = totalScore + score;
    setTotalScore(newTotalScore);
    
    if (isFinalGame) {
      // Update user_contests status to completed
      const { error } = await supabase
        .from('user_contests')
        .update({ 
          status: 'completed',
          score: newTotalScore,
          current_game_index: 0, // Reset for next time
          current_game_score: 0
        })
        .eq('contest_id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating contest status:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update contest status"
        });
        return;
      }

      setIsCompleted(true);
      toast({
        title: "Contest Completed!",
        description: `Your final score is ${newTotalScore}`,
      });
    }
  };

  const handleReturnToGaming = () => {
    navigate('/gaming');
  };

  if (!id) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {isCompleted ? "Contest Completed" : "Contest in Progress"}
            </h1>
            <p className="text-muted-foreground">Contest ID: {id}</p>
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
                    <p>• Points are awarded based on speed and accuracy</p>
                    <p>• Complete all games to finish the contest</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contest;
