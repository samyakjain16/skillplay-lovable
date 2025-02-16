
import { format } from "date-fns";
import { Trophy, Users, Clock, Award, Hash, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Contest = {
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
};

interface ContestCardProps {
  contest: Contest;
  onJoin: (contestId: string) => void;
  isJoining: boolean;
}

export const ContestCard = ({ contest, onJoin, isJoining }: ContestCardProps) => {
  const totalPrizePool = contest.current_participants * contest.entry_fee;

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{contest.title}</h3>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>Players</span>
              </div>
              <span>{contest.current_participants}/{contest.max_participants}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <span>Prize Pool</span>
              </div>
              <span>${totalPrizePool}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span>Distribution</span>
              </div>
              <span className="capitalize">{contest.prize_distribution_type}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                <span>Series</span>
              </div>
              <span>{contest.series_count} Games</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>Starts</span>
              </div>
              <span>{format(new Date(contest.start_time), 'MMM d, h:mm a')}</span>
            </div>
          </div>

          <div className="pt-4">
            <Button 
              className="w-full"
              onClick={() => onJoin(contest.id)}
              disabled={isJoining}
            >
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                `Join for $${contest.entry_fee}`
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
