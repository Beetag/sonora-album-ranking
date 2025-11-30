import { Album, AlbumLanguage } from "../types";

// iTunes Search API Logic
export const searchAlbums = async (query: string, year: number, languageContext: AlbumLanguage): Promise<Album[]> => {
  try {
    if (!query || query.trim().length === 0) return [];

    // iTunes API endpoint
    // limit=200 ensures we get a wide net of results
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(`https://itunes.apple.com/search?term=${encodedQuery}&entity=album&limit=200`);
    
    if (!response.ok) {
      throw new Error('iTunes API failed');
    }

    const data = await response.json();
    
    // We removed the strict text matching filter (e.g. item.artistName.includes(query)).
    // iTunes already performed the search relevance. We only need to filter by Year.
    const results = data.results
      .filter((item: any) => {
        // Strict Year Filter
        // Note: iTunes dates are usually ISO 8601 (e.g. "2024-05-17T07:00:00Z")
        if (!item.releaseDate) return false;
        const releaseYear = new Date(item.releaseDate).getFullYear();
        if (releaseYear !== year) return false;

        // Filter out Singles
        // 1. Check for explicit " - Single" suffix in title (common in iTunes)
        if (item.collectionName && item.collectionName.toLowerCase().includes(' - single')) {
          return false;
        }

        // 2. Check track count (heuristic: 1 track is almost always a single)
        // Note: Some singles have 2 tracks (radio edit + instrumental), but those usually hit the name check above.
        // We want to keep EPs (usually 3-6 tracks) and Albums.
        if (item.trackCount && item.trackCount === 1) {
          return false;
        }

        return true;
      })
      .map((item: any) => ({
        id: String(item.collectionId),
        title: item.collectionName,
        artist: item.artistName,
        year: new Date(item.releaseDate).getFullYear(),
        language: languageContext, // Inherit context as iTunes doesn't provide language
        // Upgrade image quality: iTunes returns 100x100, we patch URL to get 600x600
        coverUrl: item.artworkUrl100?.replace('100x100bb', '600x600bb') || item.artworkUrl100
      }));

    // Deduplication: iTunes often returns separate entries for Explicit/Clean/Deluxe versions
    // We keep the first occurrence of a "Base Title + Artist" key.
    const uniqueResults: Album[] = [];
    const seen = new Set<string>();

    for (const album of results) {
      // Create a simplified key: remove parenthetical info like "(Deluxe Edition)"
      const simplifiedTitle = album.title.toLowerCase().split('(')[0].trim();
      const key = `${simplifiedTitle}-${album.artist.toLowerCase()}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueResults.push(album);
      }
    }

    return uniqueResults;

  } catch (error) {
    console.error("iTunes Search Error:", error);
    return [];
  }
};