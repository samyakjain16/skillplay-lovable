// useGameProgress.ts
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface UseGameProgressProps {
  user: User | null;
  contestId: string;
  currentGameIndex: number;
  gameStartTime: Date | null;
  contestGames: any[] | undefined;
  contest: any;
  setCurrentGameIndex: (index: number) => void;
  setGameStartTime: (date: Date | null) => void;
}

export const useGameProgress = ({
  user,
  contestId,
  currentGameIndex,
  gameStartTime,
  contestGames,
  contest,
  setCurrentGameIndex,
  setGameStartTime
}: UseGameProgressProps) => {
  const { toast } = useToast();
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const GAME_DURATION = 30; // Game duration in seconds

  useEffect(() => {
    if (!contest || !contestGames || !user) return;

    const fetchProgress = async () => {
      const { data: completedGames, error } = await supabase
        .from("player_game_progress")
        .select("game_content_id")
        .eq("user_id", user.id)
        .eq("contest_id", contestId);
      
      if (error) {
        console.error("Error fetching progress:", error);
        return;
      }

      const completedGameIds = new Set(completedGames.map(g => g.game_content_id));

      const now = new Date();
      const contestStart = new Date(contest.start_time);
      const totalElapsedTime = Math.max(0, (now.getTime() - contestStart.getTime()) / 1000);
      
      let appropriateGameIndex = Math.min(
        Math.floor(totalElapsedTime / GAME_DURATION),
        contestGames.length - 1
      );

      while (appropriateGameIndex < contestGames.length && completedGameIds.has(contestGames[appropriateGameIndex].game_content_id)) {
        appropriateGameIndex++;
      }

      if (appropriateGameIndex >= contestGames.length) return;

      const timeIntoCurrentGame = totalElapsedTime % GAME_DURATION;
      const newRemainingTime = Math.max(0, GAME_DURATION - timeIntoCurrentGame);
      setRemainingTime(newRemainingTime);
      setGameStartTime(new Date(now.getTime() - (timeIntoCurrentGame * 1000)));
      setCurrentGameIndex(appropriateGameIndex);

      await supabase
        .from("user_contests")
        .update({ 
          current_game_index: appropriateGameIndex,
          current_game_start_time: new Date().toISOString()
        })
        .eq("contest_id", contestId)
        .eq("user_id", user.id);
    };

    fetchProgress();

    const interval = setInterval(() => {
      setRemainingTime(prev => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [contest, contestGames, contestId, user, setCurrentGameIndex, setGameStartTime]);

  return { remainingTime, GAME_DURATION };
};