
import { Card, CardContent } from "@/components/ui/card";
import { ContestDetails } from "./ContestCard/ContestDetails";
import { ContestStatusButton } from "./ContestStatusButton";
import { useToast } from "@/components/ui/use-toast";

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
}

export const ContestCard = ({ contest, onStart, isStarting, onJoin, isJoining, isInMyContests }: ContestCardProps) => {
  const totalPrizePool = contest.current_participants * contest.entry_fee;
  const { toast } = useToast();
  
  const handleContestAction = () => {
    const now = new Date();
    const startTime = new Date(contest.start_time);
    const endTime = new Date(contest.end_time);
    const isFullyBooked = contest.current_participants >= contest.max_participants;
    
    // Don't allow any actions if the contest has ended
    if (now > endTime) {
      toast({
        variant: "destructive",
        title: "Contest Ended",
        description: "This contest has already ended."
      });
      return;
    }

    // Check if the contest can be started
    if (isFullyBooked && startTime <= now && contest.status === 'upcoming') {
      if (onStart) {
        console.log('Starting contest:', contest.id);
        onStart(contest.id);
      }
    } else if (!isFullyBooked && onJoin) {
      onJoin(contest.id);
    }
  };
  
  return (
    <Card className="w-full">
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
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
