
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CountdownTimer } from "./CountdownTimer";
import type { Database } from "@/integrations/supabase/types";
import { GameContent } from "./GameContent";
import { useContest } from "./hooks/useContest";
import { useContestGames } from "./hooks/useContestGames";
import { useGameProgress } from "./hooks/useGameProgress";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";

type PlayerGameProgress = Database["public"]["Tables"]["player_game_progress"]["Insert"];

interface GameContainerProps {
  contestId: string;
  onGameComplete: (score: number, isFinalGame: boolean) => void;
  initialProgress?: {
    current_game_index: number;
    current_game_start_time: string | null;
    current_game_score: number;
  } | null;
}

export const GameContainer = ({ 
  contestId, 
  onGameComplete,
  initialProgress 
}: GameContainerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentGameIndex, setCurrentGameIndex] = useState(initialProgress?.current_game_index || 0);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(
    initialProgress?.current_game_start_time ? new Date(initialProgress.current_game_start_time) : null
  );
  const [progress, setProgress] = useState(0);

  const { data: contest } = useContest(contestId);
  const { data: contestGames, isLoading: gamesLoading } = useContestGames(contestId);
  const { remainingTime, GAME_DURATION, completedGames, isContestEnded } = useGameProgress({
    user,
    contestId,
    currentGameIndex,
    gameStartTime,
    contestGames,
    contest,
    setCurrentGameIndex,
    setGameStartTime
  });

  // Fetch leaderboard if contest has ended
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
    queryKey: ["contest-leaderboard", contestId],
    queryFn: async () => {
      console.log("Fetching leaderboard for contest:", contestId);
      const { data, error } = await supabase
        .from('player_game_progress')
        .select('user_id, score')
        .eq('contest_id', contestId)
        .order('score', { ascending: false });

      if (error) {
        console.error("Error fetching leaderboard:", error);
        throw error;
      }

      // Process the data to calculate ranks
      const processedData = data.reduce((acc: any[], curr: any, index: number) => {
        const existingEntry = acc.find(entry => entry.user_id === curr.user_id);
        if (existingEntry) {
          existingEntry.total_score += curr.score;
        } else {
          acc.push({
            user_id: curr.user_id,
            total_score: curr.score,
            rank: index + 1
          });
        }
        return acc;
      }, []);

      // Sort by total score and assign ranks
      return processedData
        .sort((a, b) => b.total_score - a.total_score)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
    },
    enabled: !!contestId && isContestEnded
  });

  // Update progress bar
  useEffect(() => {
    if (gameStartTime && remainingTime > 0) {
      const progressValue = ((GAME_DURATION - remainingTime) / GAME_DURATION) * 100;
      setProgress(progressValue);
    } else {
      setProgress(0);
    }
  }, [remainingTime, GAME_DURATION, gameStartTime]);

  const handleGameEnd = async (score: number) => {
    if (!user || !contestGames) return;

    const currentGame = contestGames[currentGameIndex];
    const timeSpent = gameStartTime ? Math.floor((Date.now() - gameStartTime.getTime()) / 1000) : GAME_DURATION;
    const isFinalGame = currentGameIndex === contestGames.length - 1;

    try {
      // First check if an entry already exists
      const { data: existingProgress, error: fetchError } = await supabase
        .from("player_game_progress")
        .select("id")
        .match({
          user_id: user.id,
          contest_id: contestId,
          game_content_id: currentGame.game_content_id
        })
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingProgress) {
        toast({
          title: "Game already completed",
          description: "Moving to next game...",
        });
      } else {
        // Only insert if no existing progress
        const progressData: PlayerGameProgress = {
          user_id: user.id,
          contest_id: contestId,
          game_content_id: currentGame.game_content_id,
          score: score,
          time_taken: timeSpent,
          started_at: gameStartTime?.toISOString(),
          completed_at: new Date().toISOString(),
          is_correct: score > 0
        };

        const { error: insertError } = await supabase
          .from("player_game_progress")
          .insert(progressData);

        if (insertError) {
          if (insertError.code === '23505') { // Unique constraint violation
            console.log("Progress already recorded, continuing...");
          } else {
            throw insertError;
          }
        }
      }

      // Update user contest progress
      const updateData = {
        current_game_index: isFinalGame ? currentGameIndex : currentGameIndex + 1,
        current_game_score: score,
        current_game_start_time: isFinalGame ? null : new Date().toISOString(),
        status: isFinalGame ? 'completed' : 'active'
      };

      await supabase
        .from('user_contests')
        .update(updateData)
        .eq('contest_id', contestId)
        .eq('user_id', user.id);

      onGameComplete(score, isFinalGame);
      
      if (!isFinalGame && !isContestEnded) {
        setCurrentGameIndex(prev => prev + 1);
        setGameStartTime(new Date());
      }
    } catch (error) {
      console.error("Error in handleGameEnd:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save game progress"
      });
    }
  };

  if (isContestEnded) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Trophy className="w-16 h-16 mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-semibold mb-4">Contest Ended</h2>
          
          {leaderboardLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Loading results...</p>
            </div>
          ) : leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-4">
              <div className="divide-y max-w-md mx-auto">
                {leaderboard.map((entry: any, index: number) => (
                  <div 
                    key={`${entry.user_id}-${index}`}
                    className="py-3 flex justify-between items-center"
                  >
                    <span className="font-medium">#{entry.rank}</span>
                    <span>Score: {entry.total_score}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8">
              <p>No results available yet. The leaderboard is being calculated.</p>
              <p className="text-sm text-muted-foreground mt-2">This may take a few moments.</p>
            </div>
          )}
        </div>
      </Card>
    );
  }

  if (gamesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!contestGames || contestGames.length === 0) {
    return (
      <div className="text-center py-8">
        <p>No games available for this contest</p>
      </div>
    );
  }

  const currentGame = contestGames[currentGameIndex];
  
  if (!currentGame) {
    return (
      <div className="text-center py-8">
        <p>Contest completed</p>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            Game {currentGameIndex + 1} of {contestGames.length}
          </h3>
          {gameStartTime && remainingTime > 0 && (
            <div className="text-sm font-medium">
              Time Remaining: <CountdownTimer 
                targetDate={new Date(gameStartTime.getTime() + (remainingTime * 1000))} 
                onEnd={() => handleGameEnd(0)} 
              />
            </div>
          )}
        </div>

        <Progress value={progress} className="h-2" />

        {completedGames?.includes(currentGame.game_content_id) ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-gray-500">This game has already been completed</p>
          </div>
        ) : (
          <GameContent game={currentGame} onComplete={handleGameEnd} />
        )}
      </div>
    </Card>
  );
};
