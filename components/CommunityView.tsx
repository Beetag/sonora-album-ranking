import React, { useEffect, useState } from 'react';
import { CommunityUserRanking } from '../types';
import { getCommunityRankings } from '../services/rankingService';
import { Users, Crown, Loader2 } from 'lucide-react';

interface CommunityViewProps {
  year: number;
  category: 'French' | 'International';
}

export const CommunityView: React.FC<CommunityViewProps> = ({ year, category }) => {
  const [users, setUsers] = useState<CommunityUserRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommunityData = async () => {
      setLoading(true);
      const data = await getCommunityRankings(year);
      setUsers(data);
      setLoading(false);
    };

    fetchCommunityData();
  }, [year]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <Loader2 className="animate-spin mb-3 text-purple-500" size={32} />
        <p>Loading community rankings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400">
          <Users size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white">Community Rankings</h2>
          <p className="text-zinc-400">See how everyone else ranked {category} albums in {year}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {users.map((user) => {
          const rankings = category === 'French' ? user.rankings.french : user.rankings.international;
          
          if (rankings.length === 0) return null;

          return (
            <div key={user.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden hover:border-zinc-700 transition-colors flex flex-col">
              {/* User Header */}
              <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3">
                <img 
                  src={user.avatarUrl} 
                  alt={user.username} 
                  className="w-10 h-10 rounded-full bg-zinc-800"
                />
                <span className="font-semibold text-white">{user.username}</span>
              </div>

              {/* Ranking List */}
              <div className="p-4 space-y-3 flex-1">
                {rankings.map((album, idx) => (
                  <div key={`${user.id}-${album.id}`} className="flex items-center gap-3">
                    <div className={`
                      flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold
                      ${idx === 0 ? 'bg-yellow-500/20 text-yellow-400' : 
                        idx === 1 ? 'bg-zinc-500/20 text-zinc-400' : 
                        idx === 2 ? 'bg-orange-500/20 text-orange-400' : 'text-zinc-600'}
                    `}>
                      {idx === 0 ? <Crown size={12} /> : idx + 1}
                    </div>
                    <img src={album.coverUrl} alt="" className="w-10 h-10 rounded-md object-cover bg-zinc-800 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{album.title}</p>
                      <p className="text-xs text-zinc-500 truncate">{album.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-3 bg-zinc-950/30 text-center">
                 <p className="text-xs text-zinc-600 uppercase font-bold tracking-wider">Top {rankings.length} {category}</p>
              </div>
            </div>
          );
        })}
      </div>
      
      {users.length === 0 && (
         <div className="text-center py-20 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-2xl">
            <p>No community rankings found for this year yet.</p>
            <p className="text-sm mt-2">Be the first to rank albums!</p>
         </div>
      )}
    </div>
  );
};