
import { Navigation } from "@/components/Navigation";
import { ContestList } from "@/components/gaming/ContestList";
import { AuthGuard } from "@/components/AuthGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GameStats } from "@/components/gaming/GameStats";

const Gaming = () => {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <GameStats />
            <Tabs defaultValue="available" className="mt-8">
              <TabsList className="w-full justify-start mb-6 bg-white border">
                <TabsTrigger value="available" className="flex-1 md:flex-none">
                  Available Contests
                </TabsTrigger>
                <TabsTrigger value="my-contests" className="flex-1 md:flex-none">
                  My Contests
                </TabsTrigger>
                <TabsTrigger value="completed" className="flex-1 md:flex-none">
                  Completed
                </TabsTrigger>
              </TabsList>
              <TabsContent value="available" className="mt-0">
                <ContestList type="available" />
              </TabsContent>
              <TabsContent value="my-contests" className="mt-0">
                <ContestList type="my-contests" />
              </TabsContent>
              <TabsContent value="completed" className="mt-0">
                <ContestList type="completed" />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
};

export default Gaming;
