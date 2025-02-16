
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Users, Clock, Award, Hash } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

export const MyContests = () => {
  const { user } = useAuth();

  const { data: contests, isLoading } = useQuery({
    queryKey: ["my-contests"],
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from("user_contests")
        .select(`
          *,
          contest:contests(*)
        `)
        .eq("user_id", user?.id)
        .order("joined_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div>Loading your contests...</div>;
  }

  if (!contests || contests.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold">No Contests Yet</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Join a contest to see it here!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {contests?.map((participation) => {
        const totalPrizePool = participation.contest.current_participants * participation.contest.entry_fee;
        
        return (
          <Card key={participation.id} className="w-full">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{participation.contest.title}</h3>
                  <p className="text-sm text-muted-foreground">{participation.contest.description}</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span>Players</span>
                    </div>
                    <span>{participation.contest.current_participants}/{participation.contest.max_participants}</span>
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
                    <span className="capitalize">{participation.contest.prize_distribution_type}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-primary" />
                      <span>Series</span>
                    </div>
                    <span>{participation.contest.series_count} Games</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>Starts</span>
                    </div>
                    <span>{format(new Date(participation.contest.start_time), 'MMM d, h:mm a')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
