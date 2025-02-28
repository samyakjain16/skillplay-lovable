
import { Card, CardContent } from "@/components/ui/card";
import { ContestDetails } from "./ContestCard/ContestDetails";
import { ContestStatusButton } from "./ContestStatusButton";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { type Contest } from "./ContestTypes";

interface ContestCardProps {
  contest: Contest;
  onStart?: (contestId: string) => Promise<void>;
  isStarting?: boolean;
  onJoin?: (contestId: string) => Promise<void>;
  isJoining?: boolean;
  isInMyContests?: boolean;
  userCompletedGames?: boolean;
}

export const ContestCard = ({ 
  contest, 
  onStart, 
  isStarting = false, 
  onJoin, 
  isJoining = false, 
  isInMyContests = false,
  userCompletedGames = false 
}: ContestCardProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const isWaitingForPlayers = 
    contest.contest_type === 'fixed_participants' && 
    (contest.current_participants || 0) < (contest.max_participants || 0);

  const handleContestAction = async (event: React.MouseEvent) => {
    event.preventDefault();
    
    // For contests in "Available Contests"
    if (!isInMyContests) {
      if (isJoining) return;
      if (onJoin) {
        await onJoin(contest.id);
      }
      return;
    }

    // For contests in "My Contests"
    if (isWaitingForPlayers) {
      toast({
        title: "Waiting for Players",
        description: `Contest will begin when ${contest.max_participants} players have joined.`,
      });
      return;
    }

    if (contest.status === 'completed') {
      navigate(`/contest/${contest.id}/leaderboard`);
      return;
    }

    if (userCompletedGames) {
      toast({
        title: "Games Completed",
        description: "You've completed all games. Leaderboard will be available when the contest ends.",
      });
      return;
    }

    if (onStart) {
      await onStart(contest.id);
    }
  };

  const totalPrizePool = (contest.entry_fee || 0) * (contest.current_participants || 0);
  
  return (
    <Card 
      className={`w-full transition-all duration-200 hover:shadow-lg ${
        contest.status === 'completed'
          ? 'cursor-pointer opacity-75'
          : isWaitingForPlayers && isInMyContests
          ? 'cursor-default opacity-75 pointer-events-none'
          : (isStarting || isJoining) 
            ? 'cursor-wait' 
            : 'cursor-pointer'
      }`}
      onClick={handleContestAction}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{contest.title}</h3>
            {contest.status === 'completed' && (
              <span className="text-sm text-muted-foreground">
                Contest completed - View leaderboard
              </span>
            )}
            {isWaitingForPlayers && (
              <span className="text-sm text-muted-foreground">
                Waiting for more players to join ({contest.current_participants}/{contest.max_participants})
              </span>
            )}
          </div>

          <ContestDetails
            currentParticipants={contest.current_participants}
            maxParticipants={contest.max_participants}
            totalPrizePool={totalPrizePool}
            prizeDistributionType={contest.prize_distribution_type}
            seriesCount={contest.series_count}
            startTime={contest.start_time}
            contestType={contest.contest_type}
            entryFee={contest.entry_fee}
          />

          <div className="pt-4">
            <ContestStatusButton 
              contest={contest}
              loading={isStarting || isJoining}
              isInMyContests={isInMyContests}
              userCompletedGames={userCompletedGames}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
