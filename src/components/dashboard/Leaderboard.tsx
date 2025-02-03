import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Leaderboard = () => {
  const topPlayers = [
    { id: 1, name: "Alex M.", points: 2500, badge: "Elite" },
    { id: 2, name: "Sarah K.", points: 2350, badge: "Pro" },
    { id: 3, name: "Mike R.", points: 2200, badge: "Expert" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Top Players
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topPlayers.map((player, index) => (
            <div
              key={player.id}
              className="flex items-center justify-between p-2"
            >
              <div className="flex items-center gap-3">
                <div className="text-lg font-bold text-gray-500">#{index + 1}</div>
                <div>
                  <div className="font-semibold">{player.name}</div>
                  <div className="text-sm text-gray-500">{player.points} pts</div>
                </div>
              </div>
              <Badge variant="secondary">
                <Medal className="h-3 w-3 mr-1" />
                {player.badge}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};