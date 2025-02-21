
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";

type PlayerGameProgress = Database["public"]["Tables"]["player_game_progress"]["Insert"];

interface GameStateHandlerProps {
  user: User | null;
  contestId: string;
  currentGame: any;
  currentGameIndex: number;
  gameStartTime: Date | null;
  gameEndInProgress: { current: boolean };
  setCurrentGameIndex: (index: number) => void;
  setGameStartTime: (time: Date) => void;
  onGameComplete: (score: number, isFinalGame: boolean) => void;
  refetchCompletedGames: (options?: RefetchOptions) => Promise<QueryObserverResult<number, Error>>;
  toast: any;
}

export const GameStateHandler = ({
  user,
  contestId,
  currentGame,
  currentGameIndex,
  gameStartTime,
  gameEndInProgress,
  setCurrentGameIndex,
  setGameStartTime,
  onGameComplete,
  refetchCompletedGames,
  toast
}: GameStateHandlerProps) => {
  const handleGameEnd = async (score: number) => {
    if (!user || !currentGame || gameEndInProgress.current) return;

    gameEndInProgress.current = true;
    const timeSpent = gameStartTime ? Math.floor((Date.now() - gameStartTime.getTime()) / 1000) : 30;
    const isFinalGame = currentGameIndex === currentGame.length - 1;
    const now = new Date().toISOString();

    try {
      // Get current server state
      const { data: currentUserContest } = await supabase
        .from('user_contests')
        .select('score, current_game_index')
        .eq('contest_id', contestId)
        .eq('user_id', user.id)
        .single();

      if (!currentUserContest) {
        throw new Error("User contest not found");
      }

      // Sync with server game index if different
      const serverGameIndex = currentUserContest.current_game_index;
      if (serverGameIndex !== currentGameIndex) {
        setCurrentGameIndex(serverGameIndex);
        gameEndInProgress.current = false;
        return;
      }

      const previousScore = currentUserContest.score || 0;
      const newTotalScore = previousScore + score;
      const nextGameIndex = isFinalGame ? currentGameIndex : currentGameIndex + 1;

      // Update user_contests
      const { error: updateError } = await supabase
        .from('user_contests')
        .update({
          current_game_index: nextGameIndex,
          current_game_score: score,
          current_game_start_time: null,
          status: isFinalGame ? 'completed' : 'active',
          completed_at: isFinalGame ? now : null,
          score: newTotalScore
        })
        .eq('contest_id', contestId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Record game progress
      const progressData: PlayerGameProgress = {
        user_id: user.id,
        contest_id: contestId,
        game_content_id: currentGame.game_content_id,
        score: score,
        time_taken: timeSpent,
        started_at: gameStartTime?.toISOString(),
        completed_at: now,
        is_correct: score > 0
      };

      await supabase.from("player_game_progress").insert(progressData);
      await refetchCompletedGames();
      onGameComplete(score, isFinalGame);

      if (!isFinalGame) {
        setCurrentGameIndex(nextGameIndex);
        setGameStartTime(new Date());
      }

    } catch (error) {
      console.error("Error in handleGameEnd:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while saving your progress.",
      });
    } finally {
      gameEndInProgress.current = false;
    }
  };

  return { handleGameEnd };
};
