
import { supabase } from "@/integrations/supabase/client";

// Constants
export const GAME_DURATION_MS = 30000; // 30 seconds

export const getAppropriateGameIndex = async (contestId: string): Promise<number | null> => {
  try {
    const { data: contest } = await supabase
      .from('contests')
      .select('start_time, series_count, status')
      .eq('id', contestId)
      .single();

    if (!contest || contest.status === 'completed') return null;

    const startTime = new Date(contest.start_time);
    const now = new Date();
    const elapsedMs = now.getTime() - startTime.getTime();
    const appropriateIndex = Math.floor(elapsedMs / GAME_DURATION_MS);

    return Math.min(appropriateIndex, contest.series_count - 1);
  } catch (error) {
    console.error('Error calculating appropriate game index:', error);
    return null;
  }
};
