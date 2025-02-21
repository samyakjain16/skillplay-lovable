
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const GAME_DURATION = 30; // in seconds

export const useContestState = (
  contestId: string,
  user: User | null,
  initialProgress?: {
    current_game_index: number;
    current_game_start_time: string | null;
    current_game_score: number;
  } | null
) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentGameIndex, setCurrentGameIndex] = useState(initialProgress?.current_game_index || 0);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(
    initialProgress?.current_game_start_time ? new Date(initialProgress.current_game_start_time) : null
  );
  const hasRedirected = useRef(false);
  const updateInProgress = useRef(false);
  const gameEndInProgress = useRef(false);

  const getGameEndTime = (): Date | null => {
    if (!gameStartTime) return null;
    
    const endTime = new Date(gameStartTime.getTime() + (GAME_DURATION * 1000));
    const now = new Date();
    
    return now > endTime ? null : endTime;
  };

  const updateGameProgress = async () => {
    if (!user || !contestId || updateInProgress.current || gameEndInProgress.current) {
      return;
    }

    try {
      updateInProgress.current = true;

      // Get contest information and user's progress
      const { data, error } = await supabase
        .from('contests')
        .select(`
          status,
          start_time,
          user_contests!inner (
            status,
            current_game_index,
            current_game_start_time,
            completed_games
          )
        `)
        .eq('id', contestId)
        .eq('user_contests.user_id', user.id)
        .single();

      if (error) {
        console.error('Error checking status:', error.message);
        return;
      }

      if (!data) {
        navigate('/gaming');
        return;
      }

      if (data.status === 'completed') {
        navigate(`/contest/${contestId}/leaderboard`);
        return;
      }

      const userContest = data.user_contests[0];
      if (userContest.status === 'completed') {
        navigate('/gaming');
        return;
      }

      // Calculate time-based game index
      const contestStartTime = new Date(data.start_time);
      const now = new Date();
      const elapsedSeconds = Math.floor((now.getTime() - contestStartTime.getTime()) / 1000);
      const timeBasedGameIndex = Math.floor(elapsedSeconds / GAME_DURATION);

      // Get completed games
      const completedGames = new Set(userContest.completed_games || []);

      // Determine the appropriate game index
      const baseGameIndex = Math.max(timeBasedGameIndex, userContest.current_game_index);
      
      // If current game is completed, move to next game
      if (completedGames.has(contestId + '_' + currentGameIndex)) {
        const nextGameIndex = currentGameIndex + 1;
        setCurrentGameIndex(nextGameIndex);
        const newStartTime = new Date();
        setGameStartTime(newStartTime);

        await supabase
          .from('user_contests')
          .update({
            current_game_index: nextGameIndex,
            current_game_start_time: newStartTime.toISOString()
          })
          .eq('contest_id', contestId)
          .eq('user_id', user.id);
          
        return;
      }

      // Update game state if needed
      if (baseGameIndex !== currentGameIndex || !gameStartTime) {
        // Calculate proper start time for current game
        const gameStartTimeFromContest = userContest.current_game_start_time
          ? new Date(userContest.current_game_start_time)
          : contestStartTime;

        const gameOffset = baseGameIndex * GAME_DURATION * 1000;
        const expectedStartTime = new Date(contestStartTime.getTime() + gameOffset);
        
        setGameStartTime(expectedStartTime);
        setCurrentGameIndex(baseGameIndex);

        // Update in database
        await supabase
          .from('user_contests')
          .update({
            current_game_index: baseGameIndex,
            current_game_start_time: expectedStartTime.toISOString()
          })
          .eq('contest_id', contestId)
          .eq('user_id', user.id);
      }

    } catch (error) {
      console.error('Error in updateGameProgress:', error);
    } finally {
      updateInProgress.current = false;
    }
  };

  return {
    currentGameIndex,
    setCurrentGameIndex,
    gameStartTime,
    setGameStartTime,
    hasRedirected,
    getGameEndTime,
    updateGameProgress,
    navigate,
    toast,
    gameEndInProgress
  };
};
