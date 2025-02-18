
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Award, Medal, Star, Target, Flag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Define achievement types
const AVAILABLE_ACHIEVEMENTS = [
  {
    id: "contests_10",
    name: "Contest Veteran",
    description: "Complete 10 contests",
    icon: Trophy,
    requirement: 10,
    type: "contests"
  },
  {
    id: "earnings_1000",
    name: "High Roller",
    description: "Earn $1,000 in total winnings",
    icon: Award,
    requirement: 1000,
    type: "earnings"
  },
  {
    id: "first_place",
    name: "Champion",
    description: "Achieve 1st place in any contest",
    icon: Medal,
    type: "rank"
  },
  {
    id: "consecutive_wins",
    name: "Winning Streak",
    description: "Win 5 contests in a row",
    icon: Star,
    requirement: 5,
    type: "streak"
  },
  {
    id: "perfect_score",
    name: "Perfect Performance",
    description: "Score 100% in all games of a contest",
    icon: Target,
    type: "performance"
  }
];

const AchievementCard = ({ 
  name, 
  description, 
  icon: Icon, 
  isEarned 
}: { 
  name: string; 
  description: string; 
  icon: any;
  isEarned: boolean;
}) => (
  <div className={`p-4 rounded-lg border ${isEarned ? 'bg-primary/5 border-primary' : 'bg-background border-border'}`}>
    <div className="flex items-start space-x-4">
      <div className={`p-2 rounded-full ${isEarned ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="flex items-center space-x-2">
          <h4 className="font-semibold">{name}</h4>
          {isEarned && (
            <Badge variant="secondary" className="text-xs">
              Earned
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  </div>
);

export const Achievements = () => {
  const { user } = useAuth();

  const { data: earnedAchievements } = useQuery({
    queryKey: ["achievements", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      // For now, returning mock data
      // In the future, this will be replaced with actual achievement tracking
      return ["contests_10"]; // Example of earned achievement IDs
    },
    enabled: !!user,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Achievements</CardTitle>
        <CardDescription>Track your gaming milestones and achievements</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="available" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="available" className="flex-1">Available</TabsTrigger>
            <TabsTrigger value="earned" className="flex-1">Earned</TabsTrigger>
          </TabsList>
          
          <TabsContent value="available" className="mt-4 space-y-4">
            {AVAILABLE_ACHIEVEMENTS.map((achievement) => (
              <AchievementCard 
                key={achievement.id}
                name={achievement.name}
                description={achievement.description}
                icon={achievement.icon}
                isEarned={earnedAchievements?.includes(achievement.id) || false}
              />
            ))}
          </TabsContent>

          <TabsContent value="earned" className="mt-4 space-y-4">
            {AVAILABLE_ACHIEVEMENTS.filter(achievement => 
              earnedAchievements?.includes(achievement.id)
            ).map((achievement) => (
              <AchievementCard
                key={achievement.id}
                name={achievement.name}
                description={achievement.description}
                icon={achievement.icon}
                isEarned={true}
              />
            ))}
            {(!earnedAchievements || earnedAchievements.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Flag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No achievements earned yet. Keep playing to unlock achievements!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
