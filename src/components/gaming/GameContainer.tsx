
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGameProgress } from "./hooks/useGameProgress";
import { useContestAndGames } from "./hooks/useContestAndGames";
import { useContestState } from "./hooks/useContestState";
import { GameProgress } from "./GameProgress";
import { LoadingState } from "./game-container/LoadingState";
import { NoGamesMessage } from "./game-container/NoGamesMessage";
import { GameHandler } from "./game-container/GameHandler";

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
    gameTimeSlot,
    setGameTimeSlot,
    getGameEndTime,
    updateGameProgress,
    toast,
    gameEndInProgress,
    hasRedirected
  } = useContestState(contestId, user, initialProgress);

  const handleGameComplete = async (score: number, isFinalGame: boolean) => {
    await refetchCompletedGames();
    onGameComplete(score, isFinalGame);
    
    if (!isFinalGame) {
      setCurrentGameIndex(prev => prev + 1);
      setGameTimeSlot(null);
      updateGameProgress();
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (!contestGames || contestGames.length === 0) {
    return <NoGamesMessage />;
  }

  if (gameProgressData && contest && gameProgressData.count >= contest.series_count) {
    const now = new Date();
    const contestEnd = new Date(contest.end_time);
    const isContestFinished = now > contestEnd;

    return <GameProgress contestId={contestId} isContestFinished={isContestFinished} />;
  }

  return (
    <GameHandler
      contestId={contestId}
      contest={contest}
      contestGames={contestGames}
      user={user}
      gameProgressData={gameProgressData}
      currentGameIndex={currentGameIndex}
      gameTimeSlot={gameTimeSlot}
      hasRedirected={hasRedirected}
      updateGameProgress={updateGameProgress}
      navigate={navigate}
      toast={toast}
      getGameEndTime={getGameEndTime}
      onGameComplete={handleGameComplete}
      gameEndInProgress={gameEndInProgress}
    />
  );
};
