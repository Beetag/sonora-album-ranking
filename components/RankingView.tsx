import React from 'react';
import { Album } from '../types'; // Still use Album for card props
import { AlbumCard } from './AlbumCard';
import { Trophy, Disc } from 'lucide-react';

interface RankingViewProps {
  ranked: Album[];
  pool: Album[];
  category: 'French' | 'International';
  onUpdateRanked: (items: Album[]) => void;
  onDeleteAlbum: (albumId: string) => void;
}

export const RankingView: React.FC<RankingViewProps> = ({
  ranked,
  pool,
  category,
  onUpdateRanked,
  onDeleteAlbum,
}) => {
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('albumId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const findAlbumAndSource = (id: string): {album: Album | undefined, source: 'pool' | 'ranked' | null} => {
    let album = ranked.find(a => a.id === id);
    if (album) return { album, source: 'ranked' };
    album = pool.find(a => a.id === id);
    if (album) return { album, source: 'pool' };
    return { album: undefined, source: null };
  }

  const handleDrop = (e: React.DragEvent, targetList: 'ranked' | 'pool') => {
    e.preventDefault();
    const albumId = e.dataTransfer.getData('albumId');
    const { album, source } = findAlbumAndSource(albumId);
    if (!album || source === targetList) return;

    let newRanked = [...ranked];
    if (targetList === 'ranked') {
      newRanked = [...newRanked, album];
    } else { // target is pool
      newRanked = newRanked.filter(a => a.id !== albumId);
    }
    onUpdateRanked(newRanked);
  };
  
  const handleReorderRanked = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const albumId = e.dataTransfer.getData('albumId');
    const { album, source } = findAlbumAndSource(albumId);

    if (!album) return;

    let newRankedList = [...ranked];
    const existingIndex = newRankedList.findIndex(a => a.id === albumId);

    if (existingIndex !== -1) {
      // Re-ordering within ranked
      if (existingIndex === targetIndex) return; // No change
      newRankedList.splice(existingIndex, 1);
    } else if (source === 'pool') {
      // Moving from pool to ranked at a specific index
      // The album is not in newRankedList yet
    } else {
        return; // Should not happen
    }

    newRankedList.splice(targetIndex, 0, album);
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
        className="flex flex-col h-[60vh] lg:h-full bg-zinc-900/50 rounded-3xl border border-zinc-800 overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, 'ranked')}
      >
         <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-green-500/10 rounded-xl text-green-400">
               <Trophy size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white">Ton Top {category}</h2>
                <p className="text-xs text-zinc-500">{ranked.length} albums classés</p>
             </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {ranked.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 rounded-2xl">
                <Trophy size={48} className="mb-4 opacity-20" />
                <p>Drag & Drop les albums ici pour les classer</p>
             </div>
          ) : (
            ranked.map((album, idx) => (
              <div 
                key={album.id} 
                className="relative"
                onDragOver={(e) => {
                  e.preventDefault(); 
                  e.stopPropagation();
                  e.currentTarget.classList.add('bg-zinc-700/50');
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
                  onDragStart={handleDragStart}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pool Column */}
      <div 
        className="flex flex-col h-[60vh] lg:h-full bg-zinc-900/50 rounded-3xl border border-zinc-800 overflow-hidden"
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
                <p className="text-xs text-zinc-500">Albums non classés du groupe</p>
             </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
           {pool.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <p>Recherchez et ajoutez des albums au pool du groupe</p>
             </div>
          ) : (
            pool.map((album, idx) => (
              <AlbumCard
                key={album.id}
                album={album}
                index={idx}
                isRanked={false}
                onPromote={promote}
                onDelete={onDeleteAlbum}
                onDragStart={handleDragStart}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
