import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ActiveContests = () => {
  const activeContests = [
    {
      id: 1,
      title: "Trivia Masters",
      timeLeft: "2:30:00",
      prizePool: "$1,000",
      participants: 245,
    },
    {
      id: 2,
      title: "Puzzle Challenge",
      timeLeft: "1:15:00",
      prizePool: "$500",
      participants: 123,
    },
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Active Contests
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeContests.map((contest) => (
            <div
              key={contest.id}
              className="flex items-center justify-between p-4 rounded-lg bg-white border"
            >
              <div>
                <h3 className="font-semibold">{contest.title}</h3>
                <div className="text-sm text-gray-500">
                  Time Left: {contest.timeLeft}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-primary">
                  <Trophy className="h-4 w-4" />
                  {contest.prizePool}
                </div>
                <Button size="sm" className="mt-2">
                  Continue Playing
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};