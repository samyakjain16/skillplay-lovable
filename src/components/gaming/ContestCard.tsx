
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
    
    // Handle completed contests
    if (now > endTime) {
      navigate(`/contest/${contest.id}`);
      return;
    }

    // Handle in-progress contests where user has completed their games
    if (userCompletedGames && now < endTime) {
      toast({
        title: "Contest Still in Progress",
        description: "Please wait for the contest to end to see final results.",
      });
      return;
    }

    // For My Contests
    if (isInMyContests) {
      if (now >= startTime && contest.status !== 'completed') {
        onStart?.(contest.id);
      }
      return;
    }

    // For Available Contests
    if (!isInMyContests && onJoin && contest.current_participants < contest.max_participants) {
      onJoin(contest.id);
    }
  };
  
  return (
    <Card 
      className="w-full transition-all duration-200 hover:shadow-lg cursor-pointer"
      onClick={handleContestAction}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{contest.title}</h3>
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
