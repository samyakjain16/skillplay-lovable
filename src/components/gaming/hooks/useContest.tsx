
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useContest = (contestId: string) => {
  return useQuery({
    queryKey: ["contest", contestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .eq("id", contestId)
        .single();

      if (error) throw error;
      return data;
    },
  });
};
