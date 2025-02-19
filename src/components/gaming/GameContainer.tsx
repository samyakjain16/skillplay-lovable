
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom"; // Add this import
import { useAuth } from "@/hooks/useAuth";
import { useGameProgress } from "./hooks/useGameProgress";
import { useContestAndGames } from "./hooks/useContestAndGames";
import { useContestState } from "./hooks/useContestState";
import { GameProgress } from "./GameProgress";
import { GameContent } from "./GameContent";
import { ContestCompletionHandler } from "./ContestCompletionHandler";
import { GameInitializer } from "./GameInitializer";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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
  const navigate = useNavigate(); // Add this line
  const { user } = useAuth();
  const { data: completedGamesCount, refetch: refetchCompletedGames } = useGameProgress(contestId);
  const { contest, contestGames, isLoading } = useContestAndGames(contestId);
  
  const {
    currentGameIndex,
    setCurrentGameIndex,
    gameStartTime,
    hasRedirected,
    getGameEndTime,
    updateGameProgress,
    toast
  } = useContestState(contestId, user, initialProgress);

  const handleGameEnd = async (score: number) => {
    if (!user || !contestGames) return;

    const currentGame = contestGames[currentGameIndex];
    const timeSpent = gameStartTime ? Math.floor((Date.now() - gameStartTime.getTime()) / 1000) : 30;
    const isFinalGame = currentGameIndex === contestGames.length - 1;
    const now = new Date().toISOString();

    try {
      // Calculate new total score by adding current game score
      const { data: currentUserContest } = await supabase
        .from('user_contests')
        .select('score')
        .eq('contest_id', contestId)
        .eq('user_id', user.id)
        .single();

      const previousScore = currentUserContest?.score || 0;
      const newTotalScore = previousScore + score;

      // Update user_contests with accumulated score and progress
      const { error: updateError } = await supabase
        .from('user_contests')
        .update({
          current_game_index: isFinalGame ? currentGameIndex : currentGameIndex + 1,
          current_game_score: score,
          current_game_start_time: null,
          status: isFinalGame ? 'completed' : 'active',
          completed_at: isFinalGame ? now : null,
          score: newTotalScore
        })
        .eq('contest_id', contestId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error("Error updating contest progress:", updateError);
        return;
      }

      // Record individual game progress
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

      const { error: progressError } = await supabase
        .from("player_game_progress")
        .insert(progressData);

      if (progressError) {
        if (progressError.code === '23505') { // Unique violation
          console.log("Game already completed, moving to next game");
          if (!isFinalGame) {
            setCurrentGameIndex(prev => prev + 1);
            updateGameProgress();
          }
          return;
        }
        throw progressError;
      }

      await refetchCompletedGames();
      onGameComplete(score, isFinalGame);
      
      if (!isFinalGame) {
        setCurrentGameIndex(prev => prev + 1);
        // New game will start with fresh timer in the initialization effect
      }

    } catch (error) {
      console.error("Error in handleGameEnd:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while saving your progress.",
      });
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

  if (completedGamesCount && contest && completedGamesCount >= contest.series_count) {
    const now = new Date();
    const contestEnd = new Date(contest.end_time);
    const isContestFinished = now > contestEnd;

    return <GameProgress contestId={contestId} isContestFinished={isContestFinished} />;
  }

  return (
    <>
      <ContestCompletionHandler
        contest={contest}
        completedGamesCount={completedGamesCount}
        hasRedirected={hasRedirected}
      />
      
      <GameInitializer
        contest={contest}
        contestGames={contestGames}
        user={user}
        completedGamesCount={completedGamesCount}
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
