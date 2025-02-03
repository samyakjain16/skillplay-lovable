import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export const ReferralProgram = () => {
  const { toast } = useToast();
  const referralCode = "PLAY123";

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({
      title: "Referral code copied!",
      description: "Share this code with your friends to earn bonuses.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Refer & Earn
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-4">
          <div className="text-sm text-gray-500 mb-2">Your Referral Code</div>
          <div className="flex items-center justify-center gap-2">
            <code className="bg-gray-100 px-4 py-2 rounded">{referralCode}</code>
            <Button size="icon" variant="ghost" onClick={copyReferralCode}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-sm text-gray-500 text-center">
          Earn 10% of your friends' first deposit!
        </div>
      </CardContent>
    </Card>
  );
};