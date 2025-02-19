
import { Card, CardContent } from "@/components/ui/card";
import { ContestDetails } from "./ContestCard/ContestDetails";
import { ContestStatusButton } from "./ContestStatusButton";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { type Contest } from "./ContestTypes";

interface ContestCardProps {
  contest: Contest;
  onStart?: (contestId: string) => void;
  isStarting?: boolean;
  onJoin?: (contestId: string) => void;
  isJoining?: boolean;
  isInMyContests?: boolean;
  userCompletedGames?: boolean;
}

export const ContestCard = ({ 
  contest, 
  onStart, 
  isStarting, 
  onJoin, 
  isJoining, 
  isInMyContests,
  userCompletedGames 
}: ContestCardProps) => {
  const totalPrizePool = contest.current_participants * contest.entry_fee;
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const isWaitingForPlayers = isInMyContests && 
    contest.contest_type === 'fixed_participants' && 
    contest.current_participants < contest.max_participants;

  const handleContestAction = () => {
    // If waiting for players, don't allow any action
    if (isWaitingForPlayers) {
      toast({
        title: "Waiting for Players",
        description: `Contest will begin when ${contest.max_participants} players have joined.`,
      });
      return;
    }

    // For contests in "Available Contests"
    if (!isInMyContests) {
      // Check if contest is full
      if (contest.current_participants >= contest.max_participants) {
        toast({
          variant: "destructive",
          title: "Contest Full",
          description: "This contest has reached its maximum number of participants.",
        });
        return;
      }

      // Allow joining for any valid contest
      onJoin?.(contest.id);
      return;
    }

    // For contests in "My Contests"
    const now = new Date();
    const startTime = contest.start_time ? new Date(contest.start_time) : null;
    const endTime = contest.end_time ? new Date(contest.end_time) : null;

    // If contest is completed, navigate to leaderboard
    if (contest.status === 'completed') {
      navigate(`/contest/${contest.id}/leaderboard`);
      return;
    }

    // If contest has ended by time
    if (endTime && now > endTime) {
      navigate(`/contest/${contest.id}/leaderboard`);
      return;
    }

    // If fixed_participants contest is waiting for players
    if (contest.contest_type === 'fixed_participants' && contest.status === 'waiting_for_players') {
      toast({
        title: "Waiting for Players",
        description: `Contest will begin when ${contest.max_participants} players have joined.`,
      });
      return;
    }

    // Contest hasn't started yet
    if (startTime && now < startTime && contest.contest_type !== 'fixed_participants') {
      toast({
        title: "Contest Not Started",
        description: `Contest will begin at ${startTime.toLocaleTimeString()} on ${startTime.toLocaleDateString()}`,
      });
      return;
    }

    // User has completed all games but contest is still running
    if (userCompletedGames) {
      toast({
        title: "Games Completed",
        description: "You've completed all games. Leaderboard will be available when the contest ends.",
      });
      return;
    }

    // Contest is active and user hasn't completed games
    if ((!startTime || now >= startTime) && (!endTime || now <= endTime) || contest.status === 'in_progress') {
      onStart?.(contest.id);
      return;
    }
  };
  
  return (
    <Card 
      className={`w-full transition-all duration-200 hover:shadow-lg ${
        contest.status === 'completed' || (contest.end_time && new Date() > new Date(contest.end_time))
          ? 'cursor-pointer opacity-75'
          : isWaitingForPlayers
          ? 'cursor-not-allowed opacity-75'
          : (isStarting || isJoining) 
            ? 'cursor-wait' 
            : 'cursor-pointer'
      }`}
      onClick={isWaitingForPlayers ? undefined : handleContestAction}
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
                Waiting for more players to join
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
              onClick={handleContestAction}
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
