
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, XCircle, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const GameStats = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["game-stats", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { count: totalContests } = await supabase
        .from("user_contests")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id);

      // For now, using placeholder data for wins and earnings
      return {
        totalContests: totalContests || 0,
        wins: 0, // Placeholder
        losses: 0, // Placeholder
        earnings: 0, // Placeholder
      };
    },
    enabled: !!user,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Game Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-background rounded-lg shadow-sm">
            <div className="flex justify-center mb-2">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div className="text-2xl font-bold">{stats?.totalContests || 0}</div>
            <div className="text-sm text-muted-foreground">Total Contests</div>
          </div>
          
          <div className="text-center p-4 bg-background rounded-lg shadow-sm">
            <div className="flex justify-center mb-2">
              <Trophy className="h-6 w-6 text-green-500" />
            </div>
            <div className="text-2xl font-bold">{stats?.wins || 0}</div>
            <div className="text-sm text-muted-foreground">Wins</div>
          </div>

          <div className="text-center p-4 bg-background rounded-lg shadow-sm">
            <div className="flex justify-center mb-2">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <div className="text-2xl font-bold">{stats?.losses || 0}</div>
            <div className="text-sm text-muted-foreground">Losses</div>
          </div>

          <div className="text-center p-4 bg-background rounded-lg shadow-sm">
            <div className="flex justify-center mb-2">
              <DollarSign className="h-6 w-6 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold">${stats?.earnings || 0}</div>
            <div className="text-sm text-muted-foreground">Total Earnings</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
