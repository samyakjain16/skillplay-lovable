
import { Navigation } from "@/components/Navigation";
import { WalletOverview } from "@/components/gaming/WalletOverview";
import { GameAnalytics } from "@/components/gaming/GameAnalytics";
import { BottomNav } from "@/components/gaming/BottomNav";
import { useState } from "react";

const Gaming = () => {
  const [showAnalytics, setShowAnalytics] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Navigation />
      <main className="container mx-auto px-4 pt-20">
        <div className="grid gap-6">
          <WalletOverview />
          {showAnalytics && <GameAnalytics />}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Gaming;
