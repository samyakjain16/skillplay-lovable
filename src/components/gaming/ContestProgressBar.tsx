
import { Progress } from "@/components/ui/progress";

interface ContestProgressBarProps {
  currentGameIndex: number;
  totalGames: number;
  isCompleted?: boolean;
}

export const ContestProgressBar = ({ 
  currentGameIndex, 
  totalGames,
  isCompleted = false
}: ContestProgressBarProps) => {
  // Ensure currentGameIndex is within bounds
  const boundedIndex = Math.min(Math.max(0, currentGameIndex), totalGames);
  
  // Calculate progress percentage
  // For the last game, ensure it shows 100% when completed
  const progressPercentage = isCompleted ? 100 : Math.min(100, (boundedIndex / totalGames) * 100);

  return (
    <div className="w-full">
      <Progress value={progressPercentage} className="h-2" />
      <div className="mt-1 text-xs text-right text-muted-foreground">
        Game {boundedIndex + (isCompleted ? 0 : 1)} of {totalGames}
      </div>
    </div>
  );
};
