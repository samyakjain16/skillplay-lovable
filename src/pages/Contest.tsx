import { Navigation } from "@/components/Navigation";
import { useParams } from "react-router-dom";

const Contest = () => {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 pt-20 pb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Contest #{id}</h1>
          <p className="text-gray-600">Contest details will be displayed here.</p>
        </div>
      </main>
    </div>
  );
};

export default Contest;