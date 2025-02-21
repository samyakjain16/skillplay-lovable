
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { User } from "@supabase/supabase-js";
import { ContestProgress, OperationLocks } from "./types/contestState";
import { GAME_DURATION_MS } from "./utils/gameIndexUtils";
import { updateGameProgress } from "./utils/gameProgressUtils";

export const useContestState = (
  contestId: string,
  user: User | null,
  initialProgress?: ContestProgress | null
) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentGameIndex, setCurrentGameIndex] = useState(
    initialProgress?.current_game_index ?? 0
  );
  const [gameStartTime, setGameStartTime] = useState<Date | null>(
    initialProgress?.current_game_start_time ? new Date(initialProgress.current_game_start_time) : null
  );

  const operationLocks = useRef<OperationLocks>({
    update: false,
    gameEnd: false,
    timerInitialized: false,
    hasRedirected: false
  });

  const getGameEndTime = (): Date | null => {
    if (!gameStartTime) return null;
    const endTime = new Date(gameStartTime.getTime() + GAME_DURATION_MS);
    return new Date() > endTime ? null : endTime;
  };

  useEffect(() => {
    if (!user || !contestId) return;

    const progressUpdate = () => updateGameProgress({
      user,
      contestId,
      operationLocks,
      setCurrentGameIndex,
      setGameStartTime,
      navigate,
      toast
    });

    progressUpdate();
    const intervalId = setInterval(progressUpdate, 5000);

    return () => clearInterval(intervalId);
  }, [user, contestId]);

  return {
    currentGameIndex,
    setCurrentGameIndex,
    gameStartTime,
    setGameStartTime,
    operationLocks,
    getGameEndTime,
    updateGameProgress: () => updateGameProgress({
      user,
      contestId,
      operationLocks,
      setCurrentGameIndex,
      setGameStartTime,
      navigate,
      toast
    }),
    navigate,
    toast
  };
};
