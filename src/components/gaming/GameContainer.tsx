
import { useState } from "react";
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
  const [currentGameIndex, setCurrentGameIndex] = useState(initialProgress?.current_game_index || 0);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(
    initialProgress?.current_game_start_time ? new Date(initialProgress.current_game_start_time) : null
  );

  const { data: contest } = useContest(contestId);
  const { data: contestGames, isLoading } = useContestGames(contestId);
  const { remainingTime, GAME_DURATION } = useGameProgress({
    user,
    contestId,
    currentGameIndex,
    gameStartTime,
    contestGames,
    contest,
    setCurrentGameIndex,
    setGameStartTime
  });

  const handleGameEnd = async (score: number) => {
    if (!user || !contestGames) return;

    const currentGame = contestGames[currentGameIndex];
    const timeSpent = gameStartTime ? Math.floor((Date.now() - gameStartTime.getTime()) / 1000) : GAME_DURATION;
    const isFinalGame = currentGameIndex === contestGames.length - 1;

    try {
      const { data: existingProgress } = await supabase
        .from("player_game_progress")
        .select("id")
        .match({
          user_id: user.id,
          contest_id: contestId,
          game_content_id: currentGame.game_content_id
        })
        .maybeSingle();

      if (!existingProgress) {
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

        await supabase
          .from("player_game_progress")
          .insert(progressData);
      }

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
    }
  };

  if (isLoading) {
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
  const gameEndTime = gameStartTime && remainingTime 
    ? new Date(gameStartTime.getTime() + (remainingTime * 1000)) 
    : null;

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Game {currentGameIndex + 1} of {contestGames.length}
        </h3>
        {gameEndTime && (
          <div className="text-sm font-medium">
            Time Remaining: <CountdownTimer targetDate={gameEndTime} onEnd={() => handleGameEnd(0)} />
          </div>
        )}
      </div>

      <div className="min-h-[300px]">
        <GameContent game={currentGame} onComplete={handleGameEnd} />
      </div>
    </Card>
  );
};
