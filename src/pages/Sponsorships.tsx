import { Navigation } from "@/components/Navigation";

const Sponsorships = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 pt-20 pb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Sponsorships</h1>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Sponsored Tournaments</h2>
              <p className="text-gray-600">No sponsored tournaments available.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Exclusive Rewards</h2>
              <p className="text-gray-600">No exclusive rewards available.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Upcoming Mega Contests</h2>
              <p className="text-gray-600">No upcoming mega contests.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Sponsorships;