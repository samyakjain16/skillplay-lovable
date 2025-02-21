
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";
import type { Game } from "./hooks/types/gameTypes";

interface GameStateHandlerProps {
  user: User | null;
  contestId: string;
  currentGame: Game;
  currentGameIndex: number;
  gameStartTime: Date | null;
  gameEndInProgress: { current: boolean };
  setCurrentGameIndex: (index: number) => void;
  setGameStartTime: (time: Date | null) => void;
  onGameComplete: (score: number, isFinalGame: boolean) => void;
  refetchCompletedGames: (options?: RefetchOptions) => Promise<QueryObserverResult<number, Error>>;
  toast: {
    toast: (props: { title: string; description: string; variant?: "default" | "destructive" }) => void;
  };
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
    const timeSpent = gameStartTime 
      ? Math.floor((Date.now() - gameStartTime.getTime()) / 1000) 
      : 30;
    const now = new Date().toISOString();

    try {
      // Get latest server state for validation
      const { data: currentContest, error: contestError } = await supabase
        .from('contests')
        .select('series_count, status')
        .eq('id', contestId)
        .maybeSingle();

      if (contestError || !currentContest) throw new Error("Contest not found");
      if (currentContest.status === 'completed') {
        throw new Error("Contest has ended");
      }

      const { data: userContest, error: userContestError } = await supabase
        .from('user_contests')
        .select('score, current_game_index, status')
        .eq('contest_id', contestId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (userContestError || !userContest) throw new Error("User contest not found");
      if (userContest.status === 'completed') {
        throw new Error("User has completed the contest");
      }

      // Validate game index
      const serverGameIndex = userContest.current_game_index;
      if (serverGameIndex !== currentGameIndex) {
        console.log("Syncing with server game index:", serverGameIndex);
        setCurrentGameIndex(serverGameIndex);
        gameEndInProgress.current = false;
        return;
      }

      const isFinalGame = currentGameIndex === currentContest.series_count - 1;
      const previousScore = userContest.score || 0;
      const newTotalScore = previousScore + score;
      const nextGameIndex = isFinalGame ? currentGameIndex : currentGameIndex + 1;

      // Update user_contests
      const { error: updateContestError } = await supabase
        .from('user_contests')
        .update({
          current_game_index: nextGameIndex,
          current_game_score: score,
          current_game_start_time: isFinalGame ? null : now,
          status: isFinalGame ? 'completed' : 'active',
          completed_at: isFinalGame ? now : null,
          score: newTotalScore
        })
        .eq('contest_id', contestId)
        .eq('user_id', user.id);

      if (updateContestError) throw updateContestError;

      // Record game progress
      const { error: progressError } = await supabase
        .from('player_game_progress')
        .insert({
          user_id: user.id,
          contest_id: contestId,
          game_content_id: currentGame.game_content.game_content_id,
          score: score,
          time_taken: timeSpent,
          started_at: gameStartTime?.toISOString(),
          completed_at: now,
          is_correct: score > 0
        });

      if (progressError) throw progressError;

      await refetchCompletedGames();
      onGameComplete(score, isFinalGame);

      if (!isFinalGame) {
        setCurrentGameIndex(nextGameIndex);
        setGameStartTime(new Date());
      } else {
        setGameStartTime(null);
      }

    } catch (error) {
      console.error("Error in handleGameEnd:", error);
      toast.toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save game progress",
        variant: "destructive"
      });
    } finally {
      gameEndInProgress.current = false;
    }
  };

  return { handleGameEnd };
};
