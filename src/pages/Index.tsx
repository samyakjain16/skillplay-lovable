
import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { FeaturedContests } from "@/components/FeaturedContests";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Wallet, Trophy, Gamepad } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Footer } from "@/components/Footer";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <Hero />
      <FeaturedContests />
      
      {user && (
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Button
              onClick={() => navigate('/gaming')} // Changed from '/contest/1' to '/gaming'
              className="flex items-center gap-2 h-16"
              variant="outline"
            >
              <Gamepad className="w-5 h-5" />
              Try a Contest
            </Button>
            
            <Button
              onClick={() => navigate('/sponsorships')}
              className="flex items-center gap-2 h-16"
              variant="outline"
            >
              <Trophy className="w-5 h-5" />
              View Sponsorships
            </Button>
            
            <Button
              onClick={() => navigate('/wallet')}
              className="flex items-center gap-2 h-16"
              variant="outline"
            >
              <Wallet className="w-5 h-5" />
              My Wallet
            </Button>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
};

export default Index;
