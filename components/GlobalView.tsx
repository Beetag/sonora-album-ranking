import React, { useEffect, useState } from 'react';
import { GlobalRankingData } from '../types';
import { generateGlobalRankings } from '../services/geminiService';
import { Users, Globe, Loader2 } from 'lucide-react';

interface GlobalViewProps {
  year: number;
  category: 'French' | 'International';
}

export const GlobalView: React.FC<GlobalViewProps> = ({ year, category }) => {
  const [data, setData] = useState<GlobalRankingData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const rankings = await generateGlobalRankings(year, category);
      setData(rankings);
      setLoading(false);
    };
    fetchData();
  }, [year, category]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-zinc-400">
        <Loader2 className="animate-spin mb-4 text-green-500" size={40} />
        <p>Gathering global data from Gemini...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
          <Globe size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white">Global Community Rankings</h2>
          <p className="text-zinc-400">Top {category} albums of {year} based on aggregated user data.</p>
        </div>
      </div>

      <div className="space-y-4">
        {data.map((item, idx) => (
          <div key={item.album.id} className="flex items-center gap-6 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all">
             <div className="w-16 h-16 flex items-center justify-center text-3xl font-bold text-zinc-700 font-mono">
               #{idx + 1}
             </div>
             <img src={item.album.coverUrl} alt="" className="w-20 h-20 rounded-lg shadow-lg" />
             <div className="flex-1">
                <h3 className="text-xl font-bold text-white">{item.album.title}</h3>
                <p className="text-zinc-400">{item.album.artist}</p>
             </div>
             <div className="text-right px-4 border-l border-zinc-800 hidden md:block">
                <div className="flex items-center justify-end gap-2 text-green-400 font-bold text-lg">
                   <Users size={16} />
                   {item.voters.toLocaleString()}
                </div>
                <p className="text-xs text-zinc-500">Total Votes</p>
             </div>
             <div className="text-right px-4">
               <div className="text-2xl font-bold text-white">{item.score}<span className="text-sm text-zinc-500">/100</span></div>
               <p className="text-xs text-zinc-500">Avg Score</p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};
