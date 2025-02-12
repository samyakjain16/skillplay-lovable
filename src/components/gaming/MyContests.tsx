
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Clock } from "lucide-react";
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
    enabled: !!user?.id, // Only run query when user ID is available
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
    <div className="space-y-4">
      {contests?.map((participation) => (
        <Card key={participation.id}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{participation.contest.title}</h3>
                <p className="text-sm text-muted-foreground">{participation.contest.description}</p>
              </div>
              <div className="text-right">
                <p className="text-primary font-semibold">
                  Prize Pool: ${participation.contest.prize_pool}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                <span>Entry Fee: ${participation.contest.entry_fee}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{format(new Date(participation.contest.start_time), 'MMM d, h:mm a')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
