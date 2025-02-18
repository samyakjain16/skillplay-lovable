
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const GameStats = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["game-stats", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { count: totalContests } = await supabase
        .from("user_contests")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id);

      // For now, using placeholder data for wins
      return {
        totalContests: totalContests || 0,
        wins: 0, // Placeholder
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
        <div className="grid grid-cols-2 gap-4">
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
        </div>

        <Button 
          variant="outline" 
          className="w-full mt-4 justify-between"
          onClick={() => navigate('/stats')} // You'll need to create this route
        >
          View Complete Stats
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};
