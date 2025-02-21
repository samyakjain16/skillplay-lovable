
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContestHeaderProps {
  isCompleted: boolean;
  title: string;
  onReturnToGaming: () => void;
}

export const ContestHeader = ({ isCompleted, title, onReturnToGaming }: ContestHeaderProps) => {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <Button
          variant="ghost"
          onClick={onReturnToGaming}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Gaming
        </Button>
        <h1 className="text-3xl font-bold">
          {isCompleted ? "Contest Completed" : "Contest in Progress"}
        </h1>
        <p className="text-muted-foreground mt-1">{title}</p>
      </div>
    </div>
  );
};
