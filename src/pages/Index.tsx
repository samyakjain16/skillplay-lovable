
import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { FeaturedContests } from "@/components/FeaturedContests";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <Hero />
      <FeaturedContests />
      <Footer />
    </div>
  );
};

export default Index;
