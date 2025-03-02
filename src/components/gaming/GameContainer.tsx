import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGameProgress } from "./hooks/useGameProgress";
import { useContestAndGames } from "./hooks/useContestAndGames";
import { useContestState } from "./hooks/useContestState";
import { GameProgress } from "./GameProgress";
import { GameContent } from "./GameContent";
import { ContestCompletionHandler } from "./ContestCompletionHandler";
import { GameInitializer } from "./GameInitializer";
import { supabase } from "@/integrations/supabase/client";

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: gameProgressData, refetch: refetchCompletedGames } = useGameProgress(contestId);
  const { contest, contestGames, isLoading } = useContestAndGames(contestId);
  
  const {
    currentGameIndex,
    setCurrentGameIndex,
    gameStartTime,
    setGameStartTime,
    getGameEndTime,
    updateGameProgress,
    toast,
    gameEndInProgress,
    hasRedirected
  } = useContestState(contestId, user, initialProgress);

  const handleGameEnd = async (score: number) => {
    if (!user || !contestGames || gameEndInProgress.current) return;

    gameEndInProgress.current = true;
    const currentGame = contestGames[currentGameIndex];
    const timeSpent = gameStartTime ? Math.floor((Date.now() - gameStartTime.getTime()) / 1000) : 30;
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
          current_game_index: isFinalGame ? contestGames.length : currentGameIndex + 1,
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
          started_at: gameStartTime?.toISOString(),
          completed_at: now,
          is_correct: score > 0
        });

      await refetchCompletedGames();
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
        description: "An error occurred while saving your progress.",
      });
    } finally {
      gameEndInProgress.current = false;
    }
  };

  useEffect(() => {
    if (!gameStartTime) return;

    const timeoutId = setTimeout(() => {
      if (!gameEndInProgress.current) {
        handleGameEnd(0);
      }
    }, getGameEndTime()?.getTime() - Date.now());

    return () => clearTimeout(timeoutId);
  }, [gameStartTime]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!gameEndInProgress.current) {
        updateGameProgress();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [updateGameProgress]);

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

  if (gameProgressData && contest && gameProgressData.count >= contest.series_count) {
    const now = new Date();
    const contestEnd = new Date(contest.end_time);
    const isContestFinished = now > contestEnd;

    return <GameProgress contestId={contestId} isContestFinished={isContestFinished} />;
  }

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
      />
    </>
  );
};
