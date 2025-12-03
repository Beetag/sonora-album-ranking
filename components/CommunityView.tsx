import React, { useState, useEffect } from 'react';
import { Group, CommunityUserRanking, RankedAlbum } from '../types';
import { getCommunityRankings } from '../services/groupService';
import { Loader2, ArrowLeft, Users, Trophy, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { User } from 'firebase/auth';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

interface CommunityViewProps {
  user: User | null;
  groups: Group[];
  selectedGroup: Group | null;
  onSelectGroup: (group: Group) => void;
  onClearGroup: () => void;
}

const MemberRankingCard: React.FC<{ member: CommunityUserRanking, year: number, category: 'French' | 'International' }> = ({ member, year, category }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const subcollectionId = category === 'French' ? 'fr' : 'inter';
  const memberRankings = (member.rankings[subcollectionId] || []).filter(r => r.year === year);

  const displayedRankings = isExpanded ? memberRankings : memberRankings.slice(0, 3);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
      <div className="p-4 bg-zinc-900 flex items-center gap-3">
        <img src={member.avatarUrl} alt={member.username} className="w-10 h-10 rounded-full" />
        <h3 className="font-bold text-white">{member.username}</h3>
      </div>
      <div className="p-4 flex-grow">
        {displayedRankings.length > 0 ? (
          <ol className="list-decimal list-inside text-sm text-zinc-300 space-y-2">
            {displayedRankings.map((album: RankedAlbum) => (
              <li key={album.albumId} className="truncate flex items-center gap-3">
                  <span className="text-xs text-zinc-500 w-5 text-center">{album.rank}.</span>
                  <img src={album.coverUrl} alt={album.title} className="w-8 h-8 rounded-sm" />
                  <div>
                      <p className="font-medium text-zinc-200 truncate">{album.title}</p>
                      <p className="text-xs text-zinc-400 truncate">{album.artist}</p>
                  </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-zinc-500 italic">No rankings for {year} in this category.</p>
        )}
      </div>
      {memberRankings.length > 3 && (
        <div className="p-2 border-t border-zinc-800">
            <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="w-full text-center text-sm font-medium text-zinc-400 hover:text-white py-1.5 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1"
            >
                {isExpanded ? 'View Less' : 'View More'}
                {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
        </div>
      )}
    </div>
  );
};

export const CommunityView: React.FC<CommunityViewProps> = ({ user, groups, selectedGroup, onSelectGroup, onClearGroup }) => {
  const [communityRankings, setCommunityRankings] = useState<CommunityUserRanking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [category, setCategory] = useState<'French' | 'International'>('French');

  useEffect(() => {
    if (selectedGroup && user) {
      setLoading(true);
      setError(null);
      getCommunityRankings([selectedGroup.id])
        .then(setCommunityRankings)
        .catch(err => {
          console.error("Error fetching community rankings:", err);
          setError(err.message || 'Could not load rankings. Check security rules and ensure you are connected.');
        })
        .finally(() => setLoading(false));
    }
  }, [selectedGroup, user]);

  if (!selectedGroup) {
    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-2 text-center text-white">View Community Rankings</h2>
            <p className="text-zinc-400 text-center mb-8">Select a group to see what everyone is ranking.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map(group => (
                    <button 
                        key={group.id} 
                        onClick={() => onSelectGroup(group)}
                        className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-green-500 transition-all text-left flex items-center gap-4"
                    >
                        <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center"><Users className="text-zinc-400" /></div>
                        <div>
                            <p className="font-bold text-white">{group.name}</p>
                            <p className="text-sm text-zinc-400">{group.members.length} member(s)</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
  }

  const subcollectionId = category === 'French' ? 'fr' : 'inter';
  const membersWithRankings = communityRankings
      .filter(member => (member.rankings[subcollectionId] || []).some(r => r.year === year));

  return (
    <div>
      <div className="mb-8">
        {/* Back button and group name */}
        <div className="mb-4">
          <button onClick={onClearGroup} className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Back to Groups</span>
              <span className="sm:hidden">Back</span>
          </button>
          <h2 className="text-2xl md:text-3xl font-bold text-white mt-2 truncate">{selectedGroup.name}</h2>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4">
          {/* Mobile: French/International buttons (full width) */}
          <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-2xl w-full md:hidden">
            <button
              onClick={() => setCategory('French')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all w-1/2 ${
                category === 'French' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              French
            </button>
            <button
              onClick={() => setCategory('International')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all w-1/2 ${
                category === 'International' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              International
            </button>
          </div>

          {/* Mobile: Calendar only */}
          <div className="flex items-center justify-center w-full md:hidden">
            <div className="relative w-32">
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full appearance-none bg-zinc-800 border border-zinc-700 rounded-xl py-2.5 pl-4 pr-8 text-sm font-medium text-white hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              >
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400">
                <Calendar size={16} />
              </div>
            </div>
          </div>

          {/* Desktop: Calendar + French/International (centered) */}
          <div className="hidden md:flex md:items-center md:justify-center gap-2 w-full">
            <div className="relative flex-shrink-0">
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full appearance-none bg-zinc-800 border border-zinc-700 rounded-xl py-2.5 pl-4 pr-8 text-sm font-medium text-white hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              >
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400">
                <Calendar size={16} />
              </div>
            </div>

            <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <button
                onClick={() => setCategory('French')}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                  category === 'French' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                French
              </button>
              <button
                onClick={() => setCategory('International')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  category === 'International' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                International
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-green-500" size={32} />
        </div>
      )}

      {!loading && error && (
        <p className="text-center text-red-400 bg-red-500/10 p-4 rounded-xl">Error: {error}</p>
      )}

      {!loading && !error && membersWithRankings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {membersWithRankings.map(member => (
            <MemberRankingCard key={member.id} member={member} year={year} category={category} />
          ))}
        </div>
      )}

      {!loading && !error && membersWithRankings.length === 0 && (
        <div className="text-center py-20 px-4">
            <Trophy className="mx-auto text-yellow-500/50" size={48} />
            <h3 className="text-xl font-bold mt-4 text-white">It's Anyone's Game!</h3>
            <p className="text-zinc-400 mt-2 max-w-md mx-auto">No one in this group has ranked albums for this category and year yet. Be the first to set the standard!</p>
        </div>
      )}
    </div>
  );
};