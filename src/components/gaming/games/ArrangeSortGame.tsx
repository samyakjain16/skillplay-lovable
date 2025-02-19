import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ArrangeSortGameProps {
  content: {
    items: string[];
    correctOrder: number[];
  };
  onComplete: (isCorrect: boolean, timeTaken: number) => Promise<void>;
}

export const ArrangeSortGame = ({ content, onComplete }: ArrangeSortGameProps) => {
  const [items, setItems] = useState([...content.items]);

  const handleItemMove = (fromIndex: number, toIndex: number) => {
    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    setItems(newItems);
  };

  const handleSubmit = () => {
    const score = items.every((item, index) => 
      content.items[content.correctOrder[index]] === item
    );
    onComplete(score, 0);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        {items.map((item, index) => (
          <Card key={index} className="p-4 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <span>{item}</span>
              <div className="flex gap-2">
                {index > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleItemMove(index, index - 1)}
                  >
                    ↑
                  </Button>
                )}
                {index < items.length - 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleItemMove(index, index + 1)}
                  >
                    ↓
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Button className="w-full" onClick={handleSubmit}>Submit Answer</Button>
    </div>
  );
};
