import { Navigation } from "@/components/Navigation";
import { useParams } from "react-router-dom";
import { Timer, Trophy, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const Contest = () => {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 pt-20 pb-8">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Game Area */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Contest #{id}</span>
                <Button variant="outline" size="icon">
                  <Timer className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Game Interface Will Appear Here</p>
              </div>
              <div className="mt-4 flex gap-4">
                <Button className="w-full">Start Game</Button>
                <Button variant="outline" className="w-full">Practice Mode</Button>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg">{i + 1}</span>
                          <span>Player {i + 1}</span>
                        </div>
                        <span className="font-semibold">{1000 - i * 50} pts</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Live Chat */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Live Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] mb-4">
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-semibold">Player {i + 1}</p>
                        <p className="text-sm text-gray-600">Good luck everyone!</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button>Send</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contest;