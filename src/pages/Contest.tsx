import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import { Timer, Trophy, MessageSquare, Users } from "lucide-react";

const Contest = () => {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Weekly Trivia Championship</h1>
            <p className="text-muted-foreground">Contest ID: {id}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-lg text-muted-foreground">Game Interface</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Timer className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Time Remaining</h3>
                  </div>
                  <p className="text-2xl font-bold">15:00</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Current Position</h3>
                  </div>
                  <p className="text-2xl font-bold">#5</p>
                  <p className="text-sm text-muted-foreground">of 128 players</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Live Chat</h3>
                  </div>
                  <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Chat coming soon</p>
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