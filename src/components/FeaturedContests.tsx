import { Trophy, Users, Clock } from 'lucide-react';

export const FeaturedContests = () => {
  const contests = [
    {
      title: "Weekly Trivia Championship",
      prize: "$5,000",
      players: "2,456",
      timeLeft: "2d 14h",
      category: "Trivia",
    },
    {
      title: "Speed Puzzle Master",
      prize: "$2,500",
      players: "1,893",
      timeLeft: "1d 6h",
      category: "Puzzle",
    },
    {
      title: "Word Game Tournament",
      prize: "$3,750",
      players: "3,211",
      timeLeft: "3d 8h",
      category: "Word Games",
    },
  ];

  return (
    <section className="py-20 px-4 bg-secondary/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Featured Contests</h2>
          <p className="text-muted">Join our most popular competitions</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {contests.map((contest, index) => (
            <div
              key={index}
              className="glass-card p-6 transform transition-all duration-300 hover:translate-y-[-4px]"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                  {contest.category}
                </span>
                <Trophy className="text-primary" size={24} />
              </div>
              
              <h3 className="text-xl font-semibold mb-4">{contest.title}</h3>
              
              <div className="space-y-3">
                <p className="text-2xl font-bold text-primary">{contest.prize}</p>
                
                <div className="flex items-center text-muted">
                  <Users size={16} className="mr-2" />
                  <span>{contest.players} players</span>
                </div>
                
                <div className="flex items-center text-muted">
                  <Clock size={16} className="mr-2" />
                  <span>{contest.timeLeft} left</span>
                </div>
              </div>
              
              <button className="w-full mt-6 btn-primary">
                Join Contest
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};