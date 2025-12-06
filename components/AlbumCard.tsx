import React from 'react';
import { Album } from '../types';
import { GripVertical, X, ArrowUp, ArrowDown, Plus } from 'lucide-react';

interface AlbumCardProps {
  album: Album;
  index: number;
  rank?: number;
  isRanked: boolean;
  onRemove?: (id: string) => void;
  onMove?: (id: string, direction: 'up' | 'down') => void;
  onPromote?: (id: string) => void;
  onDemote?: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({
  album,
  index,
  rank,
  isRanked,
  onRemove,
  onMove,
  onPromote,
  onDemote,
  onDragStart,
}) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, album.id)}
      className={`
        group relative flex items-center gap-2 md:gap-4 p-2 md:p-3 rounded-xl 
        bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 
        transition-all duration-200 shadow-sm cursor-grab active:cursor-grabbing
        ${isRanked ? 'pl-1 md:pl-2' : ''}
      `}
    >
      {/* Drag Handle */}
      <div className="text-zinc-500 group-hover:text-zinc-300 p-1">
        <GripVertical size={20} />
      </div>

      {/* Rank Number (if ranked) */}
      {isRanked && (
        <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-green-500/10 text-green-400 font-bold rounded-full text-xs md:text-sm border border-green-500/20">
          {rank}
        </div>
      )}

      {/* Album Art */}
      <img
        src={album.coverUrl}
        alt={album.title}
        className="w-10 h-10 md:w-12 md:h-12 rounded-md object-cover shadow-md bg-zinc-900 flex-shrink-0"
      />

      {/* Info - min-w-0 is crucial for text truncation in flexbox */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-white truncate text-sm">{album.title}</h4>
        <p className="text-zinc-400 text-xs truncate">{album.artist}</p>
      </div>

      {/* Desktop/Mobile Actions */}
      <div className="flex items-center gap-0.5 md:gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {isRanked ? (
          <>
            <button 
              onClick={() => onMove?.(album.id, 'up')}
              className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white"
              disabled={index === 0}
            >
              <ArrowUp size={16} />
            </button>
            <button 
              onClick={() => onMove?.(album.id, 'down')}
              className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white"
            >
              <ArrowDown size={16} />
            </button>
            <button 
              onClick={() => onDemote?.(album.id)}
              className="p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg ml-1"
              title="Remove from ranking"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <>
             <button 
              onClick={() => onPromote?.(album.id)}
              className="p-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg shadow-sm"
              title="Add to ranking"
            >
              <Plus size={16} />
            </button>
            {onRemove && (
                <button 
                onClick={() => onRemove(album.id)}
                className="p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg ml-1"
                >
                <X size={16} />
                </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
