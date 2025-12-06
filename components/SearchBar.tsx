import React, { useState, useEffect } from 'react';
import { Search, Loader2, XCircle } from 'lucide-react';
import { searchAlbums } from '../services/spotifyService';
import { Album } from '../types';

interface SearchBarProps {
  year: number;
  category: 'French' | 'International';
  onAddAlbum: (album: Album) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ year, category, onAddAlbum }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Album[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce Logic for Auto-Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length > 1) {
        setIsSearching(true);
        setIsOpen(true);
        setError(null);
        
        try {
          const albums = await searchAlbums(query, year, category);
          setResults(albums);
        } catch (e: any) {
          console.error(e);
          setError(e.message || 'An unknown error occurred.');
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
        setIsOpen(false);
        setError(null);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(delayDebounceFn);
  }, [query, year, category]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.length > 1) setIsOpen(true);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setError(null);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto mb-8 z-20">
      <form onSubmit={handleManualSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${category} albums from ${year}...`}
          className="w-full pl-12 pr-12 py-4 bg-zinc-800/50 backdrop-blur-md border border-zinc-700 rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all shadow-lg"
        />
        
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
           <Search size={20} />
        </div>

        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <Loader2 className="animate-spin text-green-500" size={20} />
          ) : query ? (
            <button 
              type="button" 
              onClick={clearSearch}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <XCircle size={20} />
            </button>
          ) : null}
        </div>
      </form>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-96 overflow-y-auto z-50">
          {error ? (
            <div className="p-4 text-center text-red-400">{error}</div>
          ) : results.length > 0 ? (
            <div className="p-2 space-y-1">
              <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider flex justify-between">
                <span>Select an album</span>
                <span>{results.length} found</span>
              </div>
              {results.map((album) => (
                <button
                  key={album.id}
                  onClick={() => {
                    onAddAlbum(album);
                    setIsOpen(false);
                    setQuery('');
                    setResults([]);
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800 rounded-xl transition-colors text-left group animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  <img 
                    src={album.coverUrl} 
                    alt="" 
                    className="w-12 h-12 rounded-md object-cover bg-zinc-800 shadow-sm" 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white group-hover:text-green-400 transition-colors truncate text-sm sm:text-base">
                      {album.title}
                    </div>
                    <div className="text-xs text-zinc-400 truncate">{album.artist}</div>
                  </div>
                  <div className="text-zinc-500 text-xs bg-zinc-800 px-2 py-1 rounded border border-zinc-700 whitespace-nowrap hidden sm:block">
                    {album.year}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            !isSearching && query.length > 1 && (
              <div className="p-8 text-center text-zinc-500">
                No results found for "{query}" in {year}.
              </div>
            )
          )}
        </div>
      )}
      
      {isOpen && (
         <div 
           className="fixed inset-0 z-[-1]" 
           onClick={() => setIsOpen(false)}
           aria-label="Close search results"
         />
      )}
    </div>
  );
};