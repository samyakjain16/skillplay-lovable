
import { Navigation } from "@/components/Navigation";
import { WalletOverview } from "@/components/gaming/WalletOverview";
import { AvailableContests } from "@/components/gaming/AvailableContests";
import { MyContests } from "@/components/gaming/MyContests";
import { BottomNav } from "@/components/gaming/BottomNav";
import { useState } from "react";

type TabType = "available" | "my-contests" | "create";

const Gaming = () => {
  const [activeTab, setActiveTab] = useState<TabType>("available");

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Navigation />
      <main className="container mx-auto px-4 pt-20">
        {activeTab === "available" && <AvailableContests />}
        {activeTab === "my-contests" && <MyContests />}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Gaming;
