
import { Navigation } from "@/components/Navigation";
import { AvailableContests } from "@/components/gaming/AvailableContests";
import { AuthGuard } from "@/components/AuthGuard";

const Gaming = () => {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <AvailableContests />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
};

export default Gaming;
