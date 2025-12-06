
import { Album } from '../types';

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;
const SEARCH_ENDPOINT = `https://api.spotify.com/v1/search`;

interface SpotifyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

let spotifyToken: {
  token: string;
  expiresAt: number;
} | null = null;

const getAccessToken = async (): Promise<string> => {
  if (spotifyToken && spotifyToken.expiresAt > Date.now()) {
    return spotifyToken.token;
  }

  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET),
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Spotify token: ${response.statusText}`);
    }

    const data: SpotifyToken = await response.json();
    
    spotifyToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 300) * 1000,
    };

    return spotifyToken.token;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    spotifyToken = null;
    throw new Error('Could not authenticate with Spotify. Please check your credentials.');
  }
};

export const searchAlbums = async (
  term: string,
  year: number,
  language: 'French' | 'International'
): Promise<Album[]> => {
  if (!term) return [];
  if (!SPOTIFY_CLIENT_ID) {
    console.error('Spotify Client ID is not configured.');
    throw new Error('The Spotify API is not configured. Please add your credentials to the .env file.');
  }

  try {
    const token = await getAccessToken();
    
    // A general search query works best. Spotify will search for the term in artist and album fields.
    // The `year` filter refines the search.
    const query = `${term} year:${year}`;
    const url = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}&type=album&limit=20`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
        if (response.status === 401) {
            spotifyToken = null;
            return searchAlbums(term, year, language); // Retry the search
        }
        throw new Error(`Spotify API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.albums.items
      .filter((item: any) => item.album_type === 'album')
      .map((item: any) => ({
        id: item.id,
        title: item.name,
        artist: item.artists.map((artist: any) => artist.name).join(', '),
        year: new Date(item.release_date).getFullYear(),
        language: language, 
        coverUrl: item.images[0]?.url || '', 
      }));

  } catch (error) {
    console.error('Error searching Spotify:', error);
    throw error; 
  }
};
