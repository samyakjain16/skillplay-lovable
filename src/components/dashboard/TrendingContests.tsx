import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const TrendingContests = () => {
  const trendingContests = [
    {
      id: 1,
      title: "Weekend Mega Tournament",
      prizePool: "$5,000",
      participants: 1200,
      category: "Tournament",
    },
    {
      id: 2,
      title: "Speed Chess Championship",
      prizePool: "$2,500",
      participants: 800,
      category: "Featured",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Trending Contests
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trendingContests.map((contest) => (
            <div
              key={contest.id}
              className="flex items-center justify-between p-4 rounded-lg bg-white border"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{contest.title}</h3>
                  <Badge variant="secondary">{contest.category}</Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                  <Users className="h-4 w-4" />
                  {contest.participants} players
                </div>
              </div>
              <div className="text-right">
                <div className="text-primary font-semibold">{contest.prizePool}</div>
                <Button size="sm" className="mt-2">
                  Join Now
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};