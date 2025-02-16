
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Timer, Gift } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

type ContestCardProps = {
  contest: {
    id: string;
    title: string;
    description: string;
    entry_fee: number;
    prize_pool: number;
    current_participants: number;
    max_participants: number;
    start_time: string;
    prize_distribution_type: string;
    series_count: number;
  };
};

export const ContestCard = ({ contest }: ContestCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg line-clamp-1">{contest.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {contest.description}
            </p>
          </div>
          <Badge variant="secondary" className="capitalize">
            {contest.prize_distribution_type.replace("_", " ")}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 my-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">Players</span>
            </div>
            <p className="font-medium">
              {contest.current_participants}/{contest.max_participants}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Trophy className="h-4 w-4" />
              <span className="text-sm">Entry Fee</span>
            </div>
            <p className="font-medium">${contest.entry_fee}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Gift className="h-4 w-4" />
              <span className="text-sm">Prize Pool</span>
            </div>
            <p className="font-medium text-primary">${contest.prize_pool}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Timer className="h-4 w-4" />
              <span className="text-sm">Series</span>
            </div>
            <p className="font-medium">{contest.series_count} Games</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Starts {format(new Date(contest.start_time), "MMM d, h:mm a")}
        </div>
        <Button size="sm">Join Now</Button>
      </CardFooter>
    </Card>
  );
};
