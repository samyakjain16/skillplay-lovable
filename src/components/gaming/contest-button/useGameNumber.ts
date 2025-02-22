
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useGameNumber = (contestId: string, isInMyContests: boolean | undefined, seriesCount: number) => {
  const { user } = useAuth();
  const [currentGameNumber, setCurrentGameNumber] = useState<number | null>(null);
  const gameCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchGameNumber = async () => {
    if (!user || !isInMyContests) return;

    try {
      const { data: contestData } = await supabase
        .from('contests')
        .select(`
          start_time,
          user_contests!inner (
            current_game_index,
            completed_games,
            current_game_start_time
          )
        `)
        .eq('id', contestId)
        .eq('user_contests.user_id', user.id);

      if (!contestData || contestData.length === 0) return;

      const userContest = contestData[0].user_contests[0];
      const completedGames = userContest.completed_games || [];
      
      const contestStartTime = new Date(contestData[0].start_time);
      const now = new Date();
      const elapsedSeconds = Math.floor((now.getTime() - contestStartTime.getTime()) / 1000);
      const timeBasedGameNumber = Math.floor(elapsedSeconds / 30) + 1;

      const gameFromIndex = userContest.current_game_index + 1;
      const gameFromCompleted = completedGames.length + 1;
      
      const effectiveGameNumber = Math.max(timeBasedGameNumber, gameFromIndex, gameFromCompleted);
      
      if (effectiveGameNumber <= seriesCount) {
        setCurrentGameNumber(effectiveGameNumber);
      }
    } catch (error) {
      console.error('Error fetching game number:', error);
    }
  };

  useEffect(() => {
    fetchGameNumber();
    
    if (isInMyContests && seriesCount > 0) {
      gameCheckIntervalRef.current = setInterval(fetchGameNumber, 5000);
    }

    return () => {
      if (gameCheckIntervalRef.current) {
        clearInterval(gameCheckIntervalRef.current);
      }
    };
  }, [isInMyContests, contestId, user?.id, seriesCount]);

  return currentGameNumber;
};
