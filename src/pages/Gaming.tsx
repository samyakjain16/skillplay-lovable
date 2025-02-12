
import { Navigation } from "@/components/Navigation";
import { WalletOverview } from "@/components/gaming/WalletOverview";
import { AvailableContests } from "@/components/gaming/AvailableContests";
import { MyContests } from "@/components/gaming/MyContests";
import { BottomNav } from "@/components/gaming/BottomNav";
import { AuthGuard } from "@/components/AuthGuard";
import { useState } from "react";

type TabType = "available" | "my-contests" | "create";

const Gaming = () => {
  const [activeTab, setActiveTab] = useState<TabType>("available");

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 pb-16">
        <Navigation />
        <main className="container mx-auto px-4 pt-20">
          {activeTab === "available" && <AvailableContests />}
          {activeTab === "my-contests" && <MyContests />}
          {activeTab === "create" && (
            <div className="text-center py-8">
              <h2 className="text-2xl font-semibold">Create Contest</h2>
              <p className="text-gray-600 mt-2">Coming soon...</p>
            </div>
          )}
        </main>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </AuthGuard>
  );
};

export default Gaming;
