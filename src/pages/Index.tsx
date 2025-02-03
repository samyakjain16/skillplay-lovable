import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { FeaturedContests } from "@/components/FeaturedContests";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <FeaturedContests />
    </div>
  );
};

export default Index;