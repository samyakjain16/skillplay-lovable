
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";

interface ContestNotFoundProps {
  onReturnToGaming: () => void;
}

export const ContestNotFound = ({ onReturnToGaming }: ContestNotFoundProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Contest Not Found</h1>
          <Button onClick={onReturnToGaming}>Return to Gaming</Button>
        </div>
      </div>
    </div>
  );
};
