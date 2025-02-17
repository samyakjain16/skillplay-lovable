// GameContainer.tsx
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useContest } from "./hooks/useContest";
import { useContestGames } from "./hooks/useContestGames";
import { useGameProgress } from "./hooks/useGameProgress";
import { CountdownTimer } from "./CountdownTimer";

export const GameContainer = ({ contestId, onGameComplete, initialProgress }) => {
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

  const handleGameEnd = async (score) => {
    if (!user || !contestGames) return;

    const currentGame = contestGames[currentGameIndex];
    const isFinalGame = currentGameIndex === contestGames.length - 1;

    await supabase
      .from("player_game_progress")
      .insert({
        user_id: user.id,
        contest_id: contestId,
        game_content_id: currentGame.game_content_id,
        score,
        completed_at: new Date().toISOString(),
        is_correct: score > 0
      });

    await supabase
      .from("user_contests")
      .update({
        current_game_index: isFinalGame ? currentGameIndex : currentGameIndex + 1,
        current_game_score: score,
        current_game_start_time: isFinalGame ? null : new Date().toISOString()
      })
      .eq("contest_id", contestId)
      .eq("user_id", user.id);
    
    onGameComplete(score, isFinalGame);

    if (!isFinalGame) {
      setCurrentGameIndex(prev => prev + 1);
      setGameStartTime(new Date());
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