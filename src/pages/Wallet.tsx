import { Navigation } from "@/components/Navigation";

const Wallet = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 pt-20 pb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Wallet</h1>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Balance</h2>
              <p className="text-2xl font-bold">$0.00</p>
              <div className="mt-4 space-x-2">
                <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                  Deposit
                </button>
                <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                  Withdraw
                </button>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Transaction History</h2>
              <p className="text-gray-600">No transactions yet.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Bonuses & Rewards</h2>
              <p className="text-gray-600">No bonuses available.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Wallet;