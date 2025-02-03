import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, Gift } from "lucide-react";

const Sponsorships = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Sponsored Tournaments</h1>
            <p className="text-muted-foreground">Exclusive contests with amazing prizes</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-6">
                <Badge className="mb-4">Featured</Badge>
                <h2 className="text-2xl font-bold mb-2">Tech Giant Challenge</h2>
                <p className="text-muted-foreground mb-4">
                  Win the latest gadgets and cash prizes worth $10,000
                </p>
                <div className="flex items-center gap-2 mb-6">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Starts in 2 days</span>
                </div>
                <Button>Register Now</Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5">
              <CardContent className="p-6">
                <Badge variant="secondary" className="mb-4">Coming Soon</Badge>
                <h2 className="text-2xl font-bold mb-2">Global Gaming Series</h2>
                <p className="text-muted-foreground mb-4">
                  Sponsored by major gaming brands. $25,000 prize pool.
                </p>
                <div className="flex items-center gap-2 mb-6">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Starts in 5 days</span>
                </div>
                <Button variant="secondary">Notify Me</Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Active Tournaments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Tournament {i}</p>
                        <p className="text-sm text-muted-foreground">Prize: $1,000</p>
                      </div>
                      <Button size="sm">Join</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Exclusive Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Special Prize {i}</p>
                        <p className="text-sm text-muted-foreground">Worth $500</p>
                      </div>
                      <Badge>Limited</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Event {i}</p>
                        <p className="text-sm text-muted-foreground">In 7 days</p>
                      </div>
                      <Button variant="outline" size="sm">Remind</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Sponsorships;