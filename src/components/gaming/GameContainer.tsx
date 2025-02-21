
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGameProgress } from "./hooks/useGameProgress";
import { useContestAndGames } from "./hooks/useContestAndGames";
import { useContestState } from "./hooks/useContestState";
import { GameProgress } from "./GameProgress";
import { GameContent } from "./GameContent";
import { GameStateHandler } from "./GameStateHandler";
import { useToast } from "@/components/ui/use-toast";
import { GameInitializer } from "./GameInitializer";
import { ContestCompletionHandler } from "./ContestCompletionHandler";
import { useRef } from "react";

interface ContestProgress {
  current_game_index: number;
  current_game_start_time: string | null;
  current_game_score: number;
  status: 'active' | 'completed';
}

interface GameContainerProps {
  contestId: string;
  onGameComplete: (score: number, isFinalGame: boolean) => void;
  initialProgress?: ContestProgress | null;
}

export const GameContainer = ({ 
  contestId, 
  onGameComplete,
  initialProgress 
}: GameContainerProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const hasRedirected = useRef(false);
  
  const { data: completedGamesCount, refetch: refetchCompletedGames } = useGameProgress(contestId);
  const { contest, contestGames, isLoading, error } = useContestAndGames(contestId);
  
  const {
    currentGameIndex,
    setCurrentGameIndex,
    gameStartTime,
    setGameStartTime,
    operationLocks,
    getGameEndTime,
    updateGameProgress
  } = useContestState(contestId, user, initialProgress);

  // Handle loading and error states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !contestGames || contestGames.length === 0) {
    return (
      <div className="text-center py-8">
        <p>{error?.message || "No games available for this contest"}</p>
      </div>
    );
  }

  // Handle completed games
  if (completedGamesCount && contest && completedGamesCount >= contest.series_count) {
    const now = new Date();
    const contestEnd = new Date(contest.end_time);
    const isContestFinished = now > contestEnd;

    return (
      <GameProgress 
        contestId={contestId} 
        isContestFinished={isContestFinished}
        onRetry={updateGameProgress}
      />
    );
  }

  const gameStateHandler = GameStateHandler({
    user,
    contestId,
    currentGame: contestGames[currentGameIndex],
    currentGameIndex,
    gameStartTime,
    gameEndInProgress: operationLocks,
    setCurrentGameIndex,
    setGameStartTime,
    onGameComplete,
    refetchCompletedGames,
    toast
  });

  return (
    <>
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
      
      <ContestCompletionHandler
        contest={contest}
        completedGamesCount={completedGamesCount}
        hasRedirected={hasRedirected}
      />

      <div className="space-y-4">
        <GameContent 
          currentGame={contestGames[currentGameIndex]}
          currentGameIndex={currentGameIndex}
          totalGames={contestGames.length}
          gameEndTime={getGameEndTime()}
          onGameEnd={gameStateHandler.handleGameEnd}
        />
      </div>
    </>
  );
};
