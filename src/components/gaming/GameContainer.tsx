
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CountdownTimer } from "./CountdownTimer";
import type { Database } from "@/integrations/supabase/types";
import { GameContent } from "./GameContent";
import { useContest } from "./hooks/useContest";
import { useContestGames } from "./hooks/useContestGames";
import { useGameProgress } from "./hooks/useGameProgress";
import { useToast } from "@/components/ui/use-toast";

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

  const { data: contest } = useContest(contestId);
  const { data: contestGames, isLoading } = useContestGames(contestId);
  const { remainingTime, GAME_DURATION, completedGames } = useGameProgress({
    user,
    contestId,
    currentGameIndex,
    gameStartTime,
    contestGames,
    contest,
    setCurrentGameIndex,
    setGameStartTime
  });

  useEffect(() => {
    if (contestGames && completedGames && currentGameIndex < contestGames.length) {
      const currentGameContentId = contestGames[currentGameIndex].game_content_id;
      if (completedGames.includes(currentGameContentId)) {
        const nextIndex = currentGameIndex + 1;
        if (nextIndex < contestGames.length) {
          setCurrentGameIndex(nextIndex);
          setGameStartTime(new Date());
        }
      }
    }
  }, [contestGames, completedGames, currentGameIndex]);

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
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw fetchError;
      }

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
      await supabase
        .from('user_contests')
        .update({
          current_game_index: isFinalGame ? currentGameIndex : currentGameIndex + 1,
          current_game_score: score,
          current_game_start_time: isFinalGame ? null : new Date().toISOString()
        })
        .eq('contest_id', contestId)
        .eq('user_id', user.id);

      onGameComplete(score, isFinalGame);
      
      if (!isFinalGame) {
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

  if (isLoading) return <p>Loading...</p>;
  if (!contestGames || contestGames.length === 0) return <p>No games available</p>;

  return (
    <div>
      <h3>Game {currentGameIndex + 1} of {contestGames.length}</h3>
      {gameStartTime && (
        <CountdownTimer targetDate={new Date(gameStartTime.getTime() + remainingTime * 1000)} onEnd={() => handleGameEnd(0)} />
      )}
      <button onClick={() => handleGameEnd(10)}>Submit Score</button>
    </div>
  );
};
