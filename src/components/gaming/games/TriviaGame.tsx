
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface TriviaGameProps {
  content: {
    question: string;
    options: string[];
    correctAnswer: number;
  };
  onComplete: (isCorrect: boolean, timeTaken: number) => Promise<void>;
}

export const TriviaGame = ({ content, onComplete }: TriviaGameProps) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const startTime = new Date().getTime();

  const handleSubmit = () => {
    if (selectedOption === null) return;
    const timeTaken = Math.floor((new Date().getTime() - startTime) / 1000); // Convert to seconds
    const isCorrect = selectedOption === content.correctAnswer;
    onComplete(isCorrect, timeTaken);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{content.question}</h3>
        <RadioGroup
          onValueChange={(value) => setSelectedOption(Number(value))}
          className="space-y-3"
        >
          {content.options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem value={index.toString()} id={`option-${index}`} />
              <Label htmlFor={`option-${index}`}>{option}</Label>
            </div>
          ))}
        </RadioGroup>
      </Card>
      <Button 
        className="w-full" 
        onClick={handleSubmit}
        disabled={selectedOption === null}
      >
        Submit Answer
      </Button>
    </div>
  );
};
