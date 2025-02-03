import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Clock, Gift } from "lucide-react";

const Wallet = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Wallet</h1>
            <p className="text-muted-foreground">Manage your funds and transactions</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <WalletIcon className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Available Balance</h2>
                </div>
                <p className="text-4xl font-bold mb-6">$1,250.00</p>
                <div className="flex gap-4">
                  <Button className="flex-1">
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Deposit
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <ArrowDownLeft className="w-4 h-4 mr-2" />
                    Withdraw
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Winnings</p>
                    <p className="text-2xl font-bold">$3,450</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contests Joined</p>
                    <p className="text-2xl font-bold">24</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Contests</p>
                    <p className="text-2xl font-bold">3</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-2xl font-bold">65%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { type: "deposit", amount: 100, date: "2024-02-20" },
                    { type: "withdrawal", amount: 50, date: "2024-02-19" },
                    { type: "winning", amount: 200, date: "2024-02-18" },
                  ].map((transaction, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <div>
                        <p className="font-medium capitalize">{transaction.type}</p>
                        <p className="text-sm text-muted-foreground">{transaction.date}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          transaction.type === "withdrawal" ? "text-red-500" : "text-green-500"
                        }`}>
                          {transaction.type === "withdrawal" ? "-" : "+"}${transaction.amount}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Bonuses & Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "Welcome Bonus", amount: 50, status: "Claimed" },
                    { name: "Referral Reward", amount: 25, status: "Available" },
                    { name: "Weekly Bonus", amount: 100, status: "Pending" },
                  ].map((bonus, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <div>
                        <p className="font-medium">{bonus.name}</p>
                        <p className="text-sm text-muted-foreground">${bonus.amount}</p>
                      </div>
                      <Badge variant={
                        bonus.status === "Claimed" ? "secondary" :
                        bonus.status === "Available" ? "success" : "outline"
                      }>
                        {bonus.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Wallet;