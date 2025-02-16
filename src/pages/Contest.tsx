
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import { Timer, Trophy, MessageSquare } from "lucide-react";
import { GameContainer } from "@/components/gaming/GameContainer";
import { useState } from "react";

const Contest = () => {
  const { id } = useParams();
  const [totalScore, setTotalScore] = useState(0);

  const handleGameComplete = (score: number) => {
    setTotalScore(prev => prev + score);
  };

  if (!id) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Contest in Progress</h1>
            <p className="text-muted-foreground">Contest ID: {id}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <GameContainer 
                contestId={id}
                onGameComplete={handleGameComplete}
              />
            </div>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Current Score</h3>
                  </div>
                  <p className="text-2xl font-bold">{totalScore}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Game Information</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p>• Each game lasts 30 seconds</p>
                    <p>• Points are awarded based on speed and accuracy</p>
                    <p>• Complete all games to finish the contest</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contest;
