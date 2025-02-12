
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const WalletOverview = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Wallet Balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-4">$1,250.00</div>
        <div className="space-y-2">
          <Button className="w-full gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Deposit
          </Button>
          <Button variant="outline" className="w-full gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            Withdraw
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
