
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface SpotDifferenceGameProps {
  content: {
    image1: string;
    image2: string;
    differences: { x: number; y: number; radius: number }[];
  };
  onComplete: (score: number) => void;
}

export const SpotDifferenceGame = ({ content, onComplete }: SpotDifferenceGameProps) => {
  const [foundDifferences, setFoundDifferences] = useState<number[]>([]);

  const handleClick = (imageNumber: number, x: number, y: number) => {
    const clickRadius = 20; // pixels
    const newFound = content.differences.reduce((acc: number[], diff, index) => {
      if (foundDifferences.includes(index)) return acc;
      
      const distance = Math.sqrt(
        Math.pow(x - diff.x, 2) + Math.pow(y - diff.y, 2)
      );
      
      if (distance <= clickRadius) {
        acc.push(index);
      }
      return acc;
    }, []);

    if (newFound.length > 0) {
      setFoundDifferences([...foundDifferences, ...newFound]);
    }
  };

  const handleSubmit = () => {
    const score = Math.round((foundDifferences.length / content.differences.length) * 100);
    onComplete(score);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-2 relative">
          <img
            src={content.image1}
            alt="Spot the difference - Image 1"
            className="w-full h-auto cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              handleClick(1, e.clientX - rect.left, e.clientY - rect.top);
            }}
          />
          {foundDifferences.map((index) => (
            <div
              key={`mark-1-${index}`}
              className="absolute w-4 h-4 border-2 border-green-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: content.differences[index].x,
                top: content.differences[index].y,
              }}
            />
          ))}
        </Card>
        <Card className="p-2 relative">
          <img
            src={content.image2}
            alt="Spot the difference - Image 2"
            className="w-full h-auto cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              handleClick(2, e.clientX - rect.left, e.clientY - rect.top);
            }}
          />
          {foundDifferences.map((index) => (
            <div
              key={`mark-2-${index}`}
              className="absolute w-4 h-4 border-2 border-green-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: content.differences[index].x,
                top: content.differences[index].y,
              }}
            />
          ))}
        </Card>
      </div>
      <div className="text-center text-sm">
        Found {foundDifferences.length} of {content.differences.length} differences
      </div>
      <Button className="w-full" onClick={handleSubmit}>
        Submit Answer
      </Button>
    </div>
  );
};
