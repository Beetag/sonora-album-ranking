import React from 'react';
import { Album } from '../types'; // Still use Album for card props
import { AlbumCard } from './AlbumCard';
import { Trophy, Disc } from 'lucide-react';

interface RankingViewProps {
  ranked: Album[];
  pool: Album[];
  category: 'French' | 'International';
  onUpdateRanked: (items: Album[]) => void;
}

export const RankingView: React.FC<RankingViewProps> = ({
  ranked,
  pool,
  category,
  onUpdateRanked,
}) => {
  const handleDragStart = (e: React.DragEvent, id: string, source: 'pool' | 'ranked') => {
    e.dataTransfer.setData('albumId', id);
    e.dataTransfer.setData('source', source);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handles dropping an item into a droppable area (Ranked or Pool)
  const handleDrop = (e: React.DragEvent, targetList: 'ranked' | 'pool') => {
    e.preventDefault();
    const albumId = e.dataTransfer.getData('albumId');
    const sourceList = e.dataTransfer.getData('source') as 'pool' | 'ranked';

    if (!albumId || sourceList === targetList) return;

    if (sourceList === 'pool' && targetList === 'ranked') {
        const albumToMove = pool.find(a => a.id === albumId);
        if (albumToMove) {
            onUpdateRanked([...ranked, albumToMove]);
        }
    } else if (sourceList === 'ranked' && targetList === 'pool') {
        const newRanked = ranked.filter(a => a.id !== albumId);
        onUpdateRanked(newRanked);
    }
  };
  
  // Handles reordering within the ranked list specifically
  const handleReorderRanked = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const albumId = e.dataTransfer.getData('albumId');
    const sourceList = e.dataTransfer.getData('source');

    let album: Album;
    let newRankedList = [...ranked];

    if (sourceList === 'ranked') {
      const currentIndex = ranked.findIndex(a => a.id === albumId);
      if (currentIndex === -1 || currentIndex === targetIndex) return;

      // Simple reorder
      [album] = newRankedList.splice(currentIndex, 1);
      newRankedList.splice(targetIndex, 0, album);

    } else { // Source is 'pool'
      const albumFromPool = pool.find(a => a.id === albumId);
      if (!albumFromPool) return;
      album = albumFromPool;

      // Insert into specific position
      newRankedList.splice(targetIndex, 0, album);
    }
    
    onUpdateRanked(newRankedList);
  };

  const promote = (albumId: string) => {
    const albumToMove = pool.find(a => a.id === albumId);
    if (albumToMove) {
        onUpdateRanked([...ranked, albumToMove]);
    }
  };

  const demote = (albumId: string) => {
    onUpdateRanked(ranked.filter(a => a.id !== albumId));
  };

  const moveRank = (id: string, direction: 'up' | 'down') => {
    const idx = ranked.findIndex(i => i.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === ranked.length - 1) return;

    const newRanked = [...ranked];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newRanked[idx], newRanked[swapIdx]] = [newRanked[swapIdx], newRanked[idx]];
    onUpdateRanked(newRanked);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* Ranked Column */}
      <div 
        className="flex flex-col h-full bg-zinc-900/50 rounded-3xl border border-zinc-800 overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, 'ranked')}
      >
         <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-green-500/10 rounded-xl text-green-400">
               <Trophy size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white">Your Top {category}</h2>
                <p className="text-xs text-zinc-500">{ranked.length} albums ranked</p>
             </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
          {ranked.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 rounded-2xl">
                <Trophy size={48} className="mb-4 opacity-20" />
                <p>Drag albums here to rank them</p>
             </div>
          ) : (
            ranked.map((album, idx) => (
              <div 
                key={album.id} 
                className="relative"
                onDragOver={(e) => {
                  e.preventDefault(); 
                  e.currentTarget.classList.add('bg-zinc-700/50'); // Visual feedback
                }}
                onDragLeave={(e) => e.currentTarget.classList.remove('bg-zinc-700/50')}
                onDrop={(e) => {
                  e.currentTarget.classList.remove('bg-zinc-700/50');
                  handleReorderRanked(e, idx)
                }}
              >
                <AlbumCard
                  album={album}
                  index={idx}
                  rank={idx + 1}
                  isRanked={true}
                  onDemote={demote}
                  onMove={moveRank}
                  onDragStart={(e, id) => handleDragStart(e, id, 'ranked')}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pool Column */}
      <div 
        className="flex flex-col h-full bg-zinc-900/50 rounded-3xl border border-zinc-800 overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, 'pool')}
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
               <Disc size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white">Collection</h2>
                <p className="text-xs text-zinc-500">Unranked albums from the group pool</p>
             </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
           {pool.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <p>Search and add albums to the group pool</p>
             </div>
          ) : (
            pool.map((album, idx) => (
              <AlbumCard
                key={album.id}
                album={album}
                index={idx}
                isRanked={false}
                onPromote={promote}
                onDragStart={(e, id) => handleDragStart(e, id, 'pool')}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};