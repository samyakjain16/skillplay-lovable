
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Contest, MyContestParticipation, AvailableContest } from "@/types/contest";

export const useContestUpdater = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const updateContestInQueries = async (contestData: Contest) => {
    if (!contestData?.id) return;

    try {
      console.log('Updating contest data:', contestData);

      // Update my-contests query
      queryClient.setQueryData(['my-contests'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((participation: MyContestParticipation) => {
          if (participation.contest.id === contestData.id) {
            return {
              ...participation,
              contest: { ...participation.contest, ...contestData }
            };
          }
          return participation;
        });
      });

      // Update available-contests query
      queryClient.setQueryData(['available-contests'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((contest: AvailableContest) => {
          if (contest.id === contestData.id) {
            return { ...contest, ...contestData };
          }
          return contest;
        });
      });

      // Force immediate refetch to ensure data consistency
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-contests'] }),
        queryClient.invalidateQueries({ queryKey: ['available-contests'] })
      ]);

    } catch (error) {
      console.error('Error updating contest data:', error);
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        // Retry with exponential backoff
        setTimeout(() => {
          updateContestInQueries(contestData);
        }, Math.pow(2, retryCount) * 1000);
      } else {
        toast({
          title: "Update Error",
          description: "Failed to update contest data. Please refresh the page.",
          variant: "destructive"
        });
      }
    }
  };

  return { updateContestInQueries };
};
