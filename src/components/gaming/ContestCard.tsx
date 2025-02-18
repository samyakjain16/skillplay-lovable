import { Card, CardContent } from "@/components/ui/card";
import { ContestDetails } from "./ContestCard/ContestDetails";
import { ContestStatusButton } from "./ContestStatusButton";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface Contest {
  id: string;
  title: string;
  description: string;
  series_count: number;
  max_participants: number;
  current_participants: number;
  status: string;
  start_time: string;
  end_time: string;
  prize_pool: number;
  entry_fee: number;
  prize_distribution_type: string;
}

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
  
  const handleContestAction = () => {
    const now = new Date();
    const startTime = new Date(contest.start_time);
    const endTime = new Date(contest.end_time);
    
    // If contest is completed, navigate to leaderboard
    if (contest.status === 'completed') {
      navigate(`/contest/${contest.id}/leaderboard`);
      return;
    }

    // If contest has ended by time
    if (now > endTime) {
      navigate(`/contest/${contest.id}/leaderboard`);
      return;
    }

    // For contests in "My Contests"
    if (isInMyContests) {
      // Contest hasn't started yet
      if (now < startTime) {
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
      if (now >= startTime && now <= endTime && !userCompletedGames) {
        onStart?.(contest.id);
        return;
      }
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

      // Contest hasn't started yet - allow joining
      if (now < startTime) {
        onJoin?.(contest.id);
        return;
      }

      // Contest is in progress - check if enough time to participate
      if (now >= startTime && now <= endTime) {
        const remainingTime = endTime.getTime() - now.getTime();
        const minimumTimeRequired = contest.series_count * 30000; // series_count * 30 seconds per game

        if (remainingTime < minimumTimeRequired) {
          toast({
            variant: "destructive",
            title: "Contest Ending Soon",
            description: `Not enough time left to complete ${contest.series_count} games.`,
          });
          return;
        }

        onJoin?.(contest.id);
        return;
      }
    }
  };
  
  return (
    <Card 
      className={`w-full transition-all duration-200 hover:shadow-lg ${
        contest.status === 'completed' || new Date() > new Date(contest.end_time)
          ? 'cursor-pointer opacity-75'
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
          </div>

          <ContestDetails
            currentParticipants={contest.current_participants}
            maxParticipants={contest.max_participants}
            totalPrizePool={totalPrizePool}
            prizeDistributionType={contest.prize_distribution_type}
            seriesCount={contest.series_count}
            startTime={contest.start_time}
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