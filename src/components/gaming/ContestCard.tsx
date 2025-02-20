import { Card, CardContent } from "@/components/ui/card";
import { ContestDetails } from "./ContestCard/ContestDetails";
import { ContestStatusButton } from "./ContestStatusButton";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { type Contest } from "./ContestTypes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const isMounted = useRef(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Memoized computed values
  const totalPrizePool = useMemo(() => {
    const entryFee = contest.entry_fee || 0;
    const participants = contest.current_participants || 0;
    return entryFee * participants;
  }, [contest.entry_fee, contest.current_participants]);

  const isWaitingForPlayers = useMemo(() => 
    contest.contest_type === 'fixed_participants' && 
    (contest.current_participants || 0) < (contest.max_participants || 0),
    [contest.contest_type, contest.current_participants, contest.max_participants]
  );

  // Memoized class names
  const cardClassName = useMemo(() => {
    const baseClasses = "w-full transition-all duration-200 hover:shadow-lg";
    
    if (!contest?.id) return `${baseClasses} opacity-50 pointer-events-none`;
    if (isProcessing || isStarting || isJoining) return `${baseClasses} cursor-wait`;
    if (contest.status === 'completed') return `${baseClasses} cursor-pointer opacity-75`;
    if (isWaitingForPlayers && isInMyContests) return `${baseClasses} cursor-default opacity-75 pointer-events-none`;
    
    return `${baseClasses} cursor-pointer`;
  }, [contest?.id, contest.status, isProcessing, isStarting, isJoining, isWaitingForPlayers, isInMyContests]);

  // Handle contest actions
  const handleContestAction = useCallback(async (event: React.MouseEvent) => {
    event.preventDefault();
    
    if (!contest?.id || isProcessing || isStarting || isJoining) {
      return;
    }

    try {
      setIsProcessing(true);

      // Available Contests section
      if (!isInMyContests) {
        if (!onJoin) {
          console.error('onJoin handler not provided for available contest');
          return;
        }

        await onJoin(contest.id);
        return;
      }

      // My Contests section
      if (isWaitingForPlayers) {
        toast({
          title: "Waiting for Players",
          description: `Contest will begin when ${contest.max_participants} players have joined.`,
        });
        return;
      }

      // Completed contest
      if (contest.status === 'completed') {
        navigate(`/contest/${contest.id}/leaderboard`);
        return;
      }

      // User completed all games
      if (userCompletedGames) {
        toast({
          title: "Games Completed",
          description: "You've completed all games. Leaderboard will be available when the contest ends.",
        });
        return;
      }

      // Start contest
      if (!onStart) {
        console.error('onStart handler not provided for active contest');
        return;
      }

      await onStart(contest.id);

    } catch (error) {
      if (isMounted.current) {
        console.error('Contest action error:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to process your request. Please try again.",
        });
      }
    } finally {
      if (isMounted.current) {
        setIsProcessing(false);
      }
    }
  }, [
    contest?.id,
    contest.max_participants,
    contest.status,
    isInMyContests,
    isJoining,
    isProcessing,
    isStarting,
    isWaitingForPlayers,
    navigate,
    onJoin,
    onStart,
    toast,
    userCompletedGames
  ]);

  // Don't render invalid contests
  if (!contest?.id) {
    return null;
  }

  return (
    <Card 
      className={cardClassName}
      onClick={handleContestAction}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">
              {contest.title || 'Untitled Contest'}
            </h3>
            
            {contest.status === 'completed' && (
              <span className="text-sm text-muted-foreground">
                Contest completed - View leaderboard
              </span>
            )}
            
            {isWaitingForPlayers && (
              <span className="text-sm text-muted-foreground">
                Waiting for more players to join ({contest.current_participants || 0}/{contest.max_participants || 0})
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
              loading={isProcessing || isStarting || isJoining}
              isInMyContests={isInMyContests}
              userCompletedGames={userCompletedGames}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};