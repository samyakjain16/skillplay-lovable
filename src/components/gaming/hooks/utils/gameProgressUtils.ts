
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { getAppropriateGameIndex, GAME_DURATION_MS } from "./gameIndexUtils";
import { OperationLocks } from "../types/contestState";

interface GameProgressConfig {
  user: User | null;
  contestId: string;
  operationLocks: React.MutableRefObject<OperationLocks>;
  setCurrentGameIndex: (index: number) => void;
  setGameStartTime: (time: Date | null) => void;
  navigate: (path: string) => void;
  toast: {
    toast: (props: { title: string; description: string; variant?: "default" | "destructive" }) => void;
  };
}

export const updateGameProgress = async ({
  user,
  contestId,
  operationLocks,
  setCurrentGameIndex,
  setGameStartTime,
  navigate,
  toast
}: GameProgressConfig) => {
  if (!user || !contestId || operationLocks.current.update || operationLocks.current.gameEnd) {
    return;
  }

  try {
    operationLocks.current.update = true;

    const [{ data: userContest }, { data: contest }] = await Promise.all([
      supabase
        .from('user_contests')
        .select('current_game_index, current_game_start_time, status')
        .eq('contest_id', contestId)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('contests')
        .select('series_count, status, start_time, end_time')
        .eq('id', contestId)
        .single()
    ]);

    if (!contest || !userContest) {
      throw new Error('Contest or user progress not found');
    }

    if (contest.status === 'completed' || userContest.status === 'completed') {
      if (!operationLocks.current.hasRedirected) {
        operationLocks.current.hasRedirected = true;
        navigate('/gaming');
      }
      return;
    }

    if (!userContest.current_game_start_time) {
      const appropriateIndex = await getAppropriateGameIndex(contestId);
      if (appropriateIndex === null) return;

      const now = new Date();
      await supabase
        .from('user_contests')
        .upsert({
          contest_id: contestId,
          user_id: user.id,
          current_game_index: appropriateIndex,
          current_game_start_time: now.toISOString(),
          status: 'active'
        })
        .eq('contest_id', contestId)
        .eq('user_id', user.id);

      setCurrentGameIndex(appropriateIndex);
      setGameStartTime(now);
      operationLocks.current.timerInitialized = true;
      return;
    }

    if (userContest.current_game_index !== undefined) {
      setCurrentGameIndex(userContest.current_game_index);
    }

    const serverStartTime = new Date(userContest.current_game_start_time);
    const timeDiff = Date.now() - serverStartTime.getTime();

    if (timeDiff >= GAME_DURATION_MS) {
      const nextIndex = userContest.current_game_index + 1;
      
      if (nextIndex >= contest.series_count) {
        await supabase
          .from('user_contests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            current_game_start_time: null
          })
          .eq('contest_id', contestId)
          .eq('user_id', user.id);

        if (!operationLocks.current.hasRedirected) {
          operationLocks.current.hasRedirected = true;
          navigate('/gaming');
        }
        return;
      }

      const now = new Date();
      await supabase
        .from('user_contests')
        .update({
          current_game_index: nextIndex,
          current_game_start_time: now.toISOString(),
          current_game_score: 0
        })
        .eq('contest_id', contestId)
        .eq('user_id', user.id);

      setCurrentGameIndex(nextIndex);
      setGameStartTime(now);
      operationLocks.current.timerInitialized = true;
    } else {
      setGameStartTime(serverStartTime);
      operationLocks.current.timerInitialized = true;
    }

  } catch (error) {
    console.error('Error in updateGameProgress:', error);
    toast.toast({
      variant: "destructive",
      title: "Error",
      description: "Failed to update game progress. Please refresh the page.",
    });
  } finally {
    operationLocks.current.update = false;
  }
};
