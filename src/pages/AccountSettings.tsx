import { Navigation } from "@/components/Navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Wallet, Bell, Shield, ChevronLeft, User, CreditCard, History, HelpCircle, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
const AccountSettings = () => {
  const navigate = useNavigate();
  const {
    user,
    signOut
  } = useAuth();
  const {
    data: profile
  } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      if (!user) return null;
      const {
        data,
        error
      } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });
  return <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <h1 className="text-2xl font-bold">Account Settings</h1>
            </div>

            <div className="space-y-6">
              {/* Profile Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-gray-600">{user?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Username</p>
                      <p className="text-gray-600">{profile?.username || 'Not set'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wallet Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    Wallet & Payments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Current Balance</p>
                      <p className="text-2xl font-bold">${profile?.wallet_balance || 0}</p>
                    </div>
                    <Button onClick={() => navigate('/wallet')}>Manage</Button>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/wallet')}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Payment Methods
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/wallet')}>
                      <History className="mr-2 h-4 w-4" />
                      Transaction History
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Notifications Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Contest Updates</p>
                        <p className="text-sm text-gray-600">Get notified about contest status changes</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Promotional Emails</p>
                        <p className="text-sm text-gray-600">Receive updates about new features and offers</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Security
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button variant="outline" className="w-full justify-start">
                      Change Password
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Two-Factor Authentication
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Support Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    Help & Support
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      FAQs
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Contact Support
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sign Out */}
              
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>;
};
export default AccountSettings;