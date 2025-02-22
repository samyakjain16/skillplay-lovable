
import { useState, useEffect, useRef } from "react";
import { getTimeStatus } from "../utils/contestButtonUtils";
import { useQueryClient } from "@tanstack/react-query";

export const useContestProgress = (
  contestId: string,
  contestStatus: string,
  startTime: string,
  endTime: string
) => {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const updateProgress = () => {
      const { progress, hasEnded } = getTimeStatus(startTime, endTime);
      setProgress(progress);

      if (hasEnded) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        queryClient.invalidateQueries({ queryKey: ["contest", contestId] });
      }
    };

    if (contestStatus === "in_progress") {
      updateProgress();
      if (!intervalRef.current) {
        intervalRef.current = setInterval(updateProgress, 1000);
      }
    } else {
      setProgress(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [contestStatus, contestId, startTime, endTime, queryClient]);

  return progress;
};
