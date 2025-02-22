
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { ContestProgressBar } from "./ContestProgressBar";
import { ContestStatusButtonProps } from "./contest-button/types";
import { useGameNumber } from "./contest-button/useGameNumber";
import { useContestProgress } from "./contest-button/useContestProgress";
import { getButtonState } from "./contest-button/getButtonState";

export const ContestStatusButton = ({ 
  contest, 
  onClick, 
  loading,
  isInMyContests,
  userCompletedGames 
}: ContestStatusButtonProps) => {
  const [localLoading, setLocalLoading] = useState(false);
  
  const currentGameNumber = useGameNumber(
    contest.id,
    isInMyContests,
    contest.series_count
  );

  const progress = useContestProgress(
    contest.id,
    contest.status,
    contest.start_time,
    contest.end_time
  );

  const buttonState = getButtonState(
    isInMyContests,
    contest.contest_type,
    contest.current_participants,
    contest.max_participants,
    contest.status,
    userCompletedGames,
    contest.series_count,
    currentGameNumber
  );

  const handleClick = async () => {
    if (loading || buttonState.disabled) return;
    
    setLocalLoading(true);
    try {
      await onClick?.();
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="relative w-full">
      <Button 
        className={`w-full relative overflow-hidden transition-all duration-500 ${buttonState.customClass}`}
        variant={buttonState.variant}
        disabled={localLoading || buttonState.disabled}
        onClick={handleClick}
      >
        {localLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isInMyContests ? "Starting..." : "Joining..."}
          </>
        ) : buttonState.showProgress ? (
          <>
            <span className="relative z-10">{buttonState.text}</span>
            <ContestProgressBar progress={progress} />
          </>
        ) : (
          buttonState.text
        )}
      </Button>
    </div>
  );
};
