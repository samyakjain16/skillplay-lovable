import { Navigation } from "@/components/Navigation";
import { ActiveContests } from "@/components/dashboard/ActiveContests";
import { TrendingContests } from "@/components/dashboard/TrendingContests";
import { WalletOverview } from "@/components/dashboard/WalletOverview";
import { Leaderboard } from "@/components/dashboard/Leaderboard";
import { ReferralProgram } from "@/components/dashboard/ReferralProgram";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 pt-20 pb-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ActiveContests />
            <TrendingContests />
          </div>
          <div className="space-y-6">
            <WalletOverview />
            <Leaderboard />
            <ReferralProgram />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;