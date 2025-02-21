
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface ContestPageHeaderProps {
  title: string;
  isCompleted: boolean;
  onReturn: () => void;
}

export const ContestPageHeader = ({ title, isCompleted, onReturn }: ContestPageHeaderProps) => {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <Button
          variant="ghost"
          onClick={onReturn}
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
