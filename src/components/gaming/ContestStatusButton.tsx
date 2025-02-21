
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { getContestState, getTimeStatus } from "./utils/contestButtonUtils";
import { type Contest } from "./ContestTypes";

interface ContestStatusButtonProps {
  contest: Contest;
  loading?: boolean;
  isInMyContests?: boolean;
  userCompletedGames?: boolean;
  currentGameIndex?: number;
}

export const ContestStatusButton = ({
  contest,
  loading,
  isInMyContests,
  userCompletedGames,
  currentGameIndex,
}: ContestStatusButtonProps) => {
  const { progress } = getTimeStatus(contest.start_time, contest.end_time);
  const buttonState = getContestState(contest, isInMyContests, userCompletedGames, currentGameIndex);

  return (
    <Button
      variant={buttonState.variant}
      disabled={buttonState.disabled || loading}
      className={`w-full relative ${buttonState.customClass}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <span className="relative z-10">{buttonState.text}</span>
          {buttonState.showProgress && (
            <div className="absolute inset-0 overflow-hidden rounded-md">
              <Progress 
                value={progress} 
                className="absolute inset-0 rounded-none bg-black/10" 
              />
            </div>
          )}
        </>
      )}
    </Button>
  );
};
