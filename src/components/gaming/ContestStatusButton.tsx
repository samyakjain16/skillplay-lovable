
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
    <div className="space-y-2">
      <Button
        variant={buttonState.variant}
        disabled={buttonState.disabled || loading}
        className={`w-full ${buttonState.customClass}`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          buttonState.text
        )}
      </Button>
      {buttonState.showProgress && (
        <Progress value={progress} className="h-2" />
      )}
    </div>
  );
};
