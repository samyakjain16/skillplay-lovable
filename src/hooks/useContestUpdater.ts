
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
    if (!contestData?.id) {
      console.warn('Invalid contest data received:', contestData);
      return;
    }

    try {
      console.log('Updating contest data:', contestData);

      // Update my-contests query
      queryClient.setQueryData(['my-contests'], (oldData: any) => {
        if (!oldData) {
          console.log('No existing my-contests data to update');
          return oldData;
        }
        console.log('Current my-contests data:', oldData);
        const updatedData = oldData.map((participation: MyContestParticipation) => {
          if (participation.contest.id === contestData.id) {
            console.log('Updating contest in my-contests:', contestData.id);
            return {
              ...participation,
              contest: { ...participation.contest, ...contestData }
            };
          }
          return participation;
        });
        console.log('Updated my-contests data:', updatedData);
        return updatedData;
      });

      // Update available-contests query
      queryClient.setQueryData(['available-contests'], (oldData: any) => {
        if (!oldData) {
          console.log('No existing available-contests data to update');
          return oldData;
        }
        console.log('Current available-contests data:', oldData);
        const updatedData = oldData.map((contest: AvailableContest) => {
          if (contest.id === contestData.id) {
            console.log('Updating contest in available-contests:', contestData.id);
            return { ...contest, ...contestData };
          }
          return contest;
        });
        console.log('Updated available-contests data:', updatedData);
        return updatedData;
      });

      // Force immediate refetch to ensure data consistency
      console.log('Forcing query invalidation for contest:', contestData.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-contests'] }),
        queryClient.invalidateQueries({ queryKey: ['available-contests'] })
      ]);

    } catch (error) {
      console.error('Error updating contest data:', error);
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        console.log(`Retrying update (attempt ${retryCount + 1}/${maxRetries})`);
        // Retry with exponential backoff
        setTimeout(() => {
          updateContestInQueries(contestData);
        }, Math.pow(2, retryCount) * 1000);
      } else {
        console.error('Max retry attempts reached');
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
