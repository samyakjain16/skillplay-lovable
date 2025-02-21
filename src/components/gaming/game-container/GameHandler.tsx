
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { GameTimeSlot } from "@/components/contest/types";
import { ContestCompletionHandler } from "../ContestCompletionHandler";
import { GameInitializer } from "../GameInitializer";
import { GameContent } from "../GameContent";

interface GameHandlerProps {
  contestId: string;
  contest: any;
  contestGames: any[];
  user: User | null;
  gameProgressData: any;
  currentGameIndex: number;
  gameTimeSlot: GameTimeSlot | null;
  hasRedirected: React.MutableRefObject<boolean>;
  updateGameProgress: () => void;
  navigate: (path: string) => void;
  toast: any;
  getGameEndTime: () => Date | null;
  onGameComplete: (score: number, isFinalGame: boolean) => void;
  gameEndInProgress: React.MutableRefObject<boolean>;
}

export const GameHandler = ({
  contestId,
  contest,
  contestGames,
  user,
  gameProgressData,
  currentGameIndex,
  gameTimeSlot,
  hasRedirected,
  updateGameProgress,
  navigate,
  toast,
  getGameEndTime,
  onGameComplete,
  gameEndInProgress,
}: GameHandlerProps) => {
  const handleGameEnd = async (score: number) => {
    if (!user || !contestGames || gameEndInProgress.current) return;

    gameEndInProgress.current = true;
    const currentGame = contestGames[currentGameIndex];
    const timeSpent = gameTimeSlot ? Math.floor((new Date(gameTimeSlot.end_time).getTime() - new Date(gameTimeSlot.start_time).getTime()) / 1000) : 30;
    const isFinalGame = currentGameIndex === contestGames.length - 1;
    const now = new Date().toISOString();

    try {
      const { data: userContest } = await supabase
        .from('user_contests')
        .select('current_game_index, score, completed_games')
        .eq('contest_id', contestId)
        .eq('user_id', user.id)
        .single();

      if (!userContest) throw new Error('User contest not found');

      const previousScore = userContest.score || 0;
      const newTotalScore = previousScore + score;

      const completedGames = userContest.completed_games || [];
      const updatedCompletedGames = [...completedGames, currentGame.game_content_id];

      const { error: updateError } = await supabase
        .from('user_contests')
        .update({
          current_game_index: isFinalGame ? currentGameIndex : currentGameIndex + 1,
          current_game_score: score,
          current_game_start_time: null,
          completed_games: updatedCompletedGames,
          status: isFinalGame ? 'completed' : 'active',
          completed_at: isFinalGame ? now : null,
          score: newTotalScore
        })
        .eq('contest_id', contestId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await supabase
        .from("player_game_progress")
        .insert({
          user_id: user.id,
          contest_id: contestId,
          game_content_id: currentGame.game_content_id,
          score: score,
          time_taken: timeSpent,
          started_at: gameTimeSlot?.start_time,
          completed_at: now,
          is_correct: score > 0
        });

      onGameComplete(score, isFinalGame);
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

  return (
    <>
      <ContestCompletionHandler
        contest={contest}
        completedGamesCount={gameProgressData?.count}
        hasRedirected={hasRedirected}
      />
      
      <GameInitializer
        contest={contest}
        contestGames={contestGames}
        user={user}
        completedGamesCount={gameProgressData?.count}
        hasRedirected={hasRedirected}
        updateGameProgress={updateGameProgress}
        navigate={navigate}
        toast={toast}
      />

      <GameContent 
        currentGame={contestGames[currentGameIndex]}
        currentGameIndex={currentGameIndex}
        totalGames={contestGames.length}
        gameEndTime={getGameEndTime()}
        onGameEnd={handleGameEnd}
        gameTimeSlot={gameTimeSlot}
      />
    </>
  );
};
