import { Navigation } from "@/components/Navigation";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, History, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const Wallet = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 pt-20 pb-8">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Balance Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <WalletIcon className="h-5 w-5" />
                Wallet Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-6">$1,250.00</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Button className="gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  Deposit Funds
                </Button>
                <Button variant="outline" className="gap-2">
                  <ArrowDownLeft className="h-4 w-4" />
                  Withdraw Funds
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted">Total Winnings</p>
                  <p className="text-2xl font-bold">$3,450.00</p>
                </div>
                <div>
                  <p className="text-sm text-muted">Active Contests</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
                <div>
                  <p className="text-sm text-muted">Available Bonuses</p>
                  <p className="text-2xl font-bold">$50.00</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">
                          {i % 2 === 0 ? "Contest Winnings" : "Deposit"}
                        </p>
                        <p className="text-sm text-muted">
                          {new Date().toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`text-lg font-bold ${i % 2 === 0 ? "text-green-500" : "text-blue-500"}`}>
                        {i % 2 === 0 ? "+" : "-"}$
                        {(Math.random() * 1000).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Bonuses & Rewards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Bonuses & Rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-1">Welcome Bonus #{i + 1}</h3>
                    <p className="text-sm text-muted mb-3">
                      Get {50 - i * 10}% bonus on your next deposit
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Claim Now
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Wallet;