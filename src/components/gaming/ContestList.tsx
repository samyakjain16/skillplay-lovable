
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ContestCard } from "./ContestCard";
import { useAuth } from "@/hooks/useAuth";

type ContestListProps = {
  type: "available" | "my-contests" | "completed";
};

export const ContestList = ({ type }: ContestListProps) => {
  const { user } = useAuth();

  const { data: contests, isLoading } = useQuery({
    queryKey: ["contests", type],
    queryFn: async () => {
      switch (type) {
        case "available":
          const { data: availableData, error: availableError } = await supabase
            .from("contests")
            .select("*")
            .eq("status", "upcoming")
            .order("start_time", { ascending: true });
          if (availableError) throw availableError;
          return availableData;

        case "my-contests":
          if (!user?.id) return [];
          const { data: myData, error: myError } = await supabase
            .from("user_contests")
            .select(`
              *,
              contest:contests(*)
            `)
            .eq("user_id", user.id)
            .order("joined_at", { ascending: false });
          if (myError) throw myError;
          return myData.map(uc => uc.contest);

        case "completed":
          const { data: completedData, error: completedError } = await supabase
            .from("contests")
            .select("*")
            .eq("status", "completed")
            .order("end_time", { ascending: false });
          if (completedError) throw completedError;
          return completedData;
      }
    },
    enabled: type === "my-contests" ? !!user?.id : true,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!contests || contests.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold">No Contests Found</h3>
        <p className="text-sm text-muted-foreground mt-2">
          {type === "available" 
            ? "Check back later for new contests!"
            : type === "my-contests"
            ? "Join a contest to get started!"
            : "No completed contests yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {contests.map((contest) => (
        <ContestCard key={contest.id} contest={contest} />
      ))}
    </div>
  );
};
