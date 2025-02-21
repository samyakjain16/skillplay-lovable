
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ContestData } from "../types";

export const useContestData = (id: string) => {
  const { toast } = useToast();

  return useQuery({
    queryKey: ["contest", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching contest:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load contest details"
        });
        throw error;
      }
      return data as ContestData;
    }
  });
};
