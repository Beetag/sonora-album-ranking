import React from 'react';
import { Album } from '../types';
import { AlbumCard } from './AlbumCard';
import { Trophy, Disc } from 'lucide-react';

interface RankingViewProps {
  ranked: Album[];
  pool: Album[];
  category: 'French' | 'International';
  onUpdateRanked: (items: Album[]) => void;
  onUpdatePool: (items: Album[]) => void;
  onListsUpdate: (ranked: Album[], pool: Album[]) => void;
}

export const RankingView: React.FC<RankingViewProps> = ({
  ranked,
  pool,
  category,
  onUpdateRanked,
  onUpdatePool,
  onListsUpdate,
}) => {
  const handleDragStart = (e: React.DragEvent, id: string, source: 'pool' | 'ranked') => {
    e.dataTransfer.setData('id', id);
    e.dataTransfer.setData('source', source);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, target: 'pool' | 'ranked') => {
    e.preventDefault();
    const id = e.dataTransfer.getData('id');
    const source = e.dataTransfer.getData('source') as 'pool' | 'ranked';

    if (source === target) return; // Reordering handled elsewhere/ignored for pool

    let item: Album | undefined;
    let newRanked = [...ranked];
    let newPool = [...pool];

    // Remove from source
    if (source === 'ranked') {
      const idx = newRanked.findIndex(a => a.id === id);
      if (idx !== -1) {
        item = newRanked[idx];
        newRanked.splice(idx, 1);
      }
    } else {
      const idx = newPool.findIndex(a => a.id === id);
      if (idx !== -1) {
        item = newPool[idx];
        newPool.splice(idx, 1);
      }
    }

    // Add to target
    if (item) {
      if (target === 'ranked') {
        newRanked.push(item);
      } else {
        newPool.unshift(item); // Add to top of pool
      }
      
      // Atomic Update
      onListsUpdate(newRanked, newPool);
    }
  };

  const handleReorderRanked = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation(); // Stop bubbling to the container drop
    const id = e.dataTransfer.getData('id');
    const source = e.dataTransfer.getData('source');

    if (source !== 'ranked') {
        // Handle drop from pool into specific rank position
        const itemIndexPool = pool.findIndex(p => p.id === id);
        if (itemIndexPool === -1) return;
        
        const item = pool[itemIndexPool];
        const newPool = pool.filter(p => p.id !== id);
        
        const newRanked = [...ranked];
        newRanked.splice(targetIndex, 0, item);
        
        onListsUpdate(newRanked, newPool);
        return;
    }

    // Reorder within ranked
    const currentIndex = ranked.findIndex(r => r.id === id);
    if (currentIndex === -1 || currentIndex === targetIndex) return;

    const newRanked = [...ranked];
    const [movedItem] = newRanked.splice(currentIndex, 1);
    newRanked.splice(targetIndex, 0, movedItem);
    onUpdateRanked(newRanked);
  };

  // Helper moves
  const promote = (id: string) => {
    const item = pool.find(i => i.id === id);
    if (!item) return;
    
    const newPool = pool.filter(i => i.id !== id);
    const newRanked = [...ranked, item];
    
    onListsUpdate(newRanked, newPool);
  };

  const demote = (id: string) => {
    const item = ranked.find(i => i.id === id);
    if (!item) return;
    
    const newRanked = ranked.filter(i => i.id !== id);
    const newPool = [item, ...pool];
    
    onListsUpdate(newRanked, newPool);
  };

  const remove = (id: string, from: 'pool' | 'ranked') => {
     if(from === 'pool') onUpdatePool(pool.filter(i => i.id !== id));
     else onUpdateRanked(ranked.filter(i => i.id !== id));
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
                onDragOver={(e) => { e.preventDefault(); /* Allow drop */ }}
                onDrop={(e) => handleReorderRanked(e, idx)}
              >
                <AlbumCard
                  album={album}
                  index={idx}
                  rank={idx + 1}
                  isRanked={true}
                  onRemove={(id) => remove(id, 'ranked')}
                  onDemote={demote}
                  onMove={moveRank}
                  onDragStart={handleDragStart}
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
                <p className="text-xs text-zinc-500">Unranked albums</p>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
           {pool.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <p>Search and add albums to your pool</p>
             </div>
          ) : (
            pool.map((album, idx) => (
              <AlbumCard
                key={album.id}
                album={album}
                index={idx}
                isRanked={false}
                onRemove={(id) => remove(id, 'pool')}
                onPromote={promote}
                onDragStart={handleDragStart}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};