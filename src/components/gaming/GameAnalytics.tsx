
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, XCircle } from "lucide-react";

export const GameAnalytics = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Game Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <Trophy className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold">15</div>
            <div className="text-sm text-muted-foreground">Games Won</div>
          </div>
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-2xl font-bold">8</div>
            <div className="text-sm text-muted-foreground">Games Lost</div>
          </div>
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <Target className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">23</div>
            <div className="text-sm text-muted-foreground">Total Games</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
