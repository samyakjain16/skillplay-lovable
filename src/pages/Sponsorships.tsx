import { Navigation } from "@/components/Navigation";
import { Award, Calendar, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Sponsorships = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 pt-20 pb-8">
        <div className="space-y-6">
          {/* Featured Sponsorship */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Summer Championship</h2>
                  <p className="text-muted mb-4">
                    Join the biggest tournament of the season with a massive prize pool
                    sponsored by our partners.
                  </p>
                  <Button size="lg" className="w-full md:w-auto">
                    Register Now
                  </Button>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary mb-2">$50,000</div>
                    <div className="text-muted">Prize Pool</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Sponsored Tournaments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Sponsored Tournaments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Tournament {i + 1}</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Sponsored by Company {i + 1}
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Exclusive Rewards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Exclusive Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Special Prize {i + 1}</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Win exclusive merchandise and rewards
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        Learn More
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Mega Contest {i + 1}</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Starts in {3 - i} days
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        Set Reminder
                      </Button>
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