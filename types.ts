export type AlbumSubcollection = 'fr' | 'inter';

export interface Album {
  id: string;
  title: string;
  artist: string;
  year: number;
  language: 'French' | 'International';
  coverUrl: string;
  type: 'album' | 'ep';
}

// New type for an album in a group's pool subcollection
export interface PoolAlbum {
  id: string; // Spotify ID or other unique ID, used as doc ID
  title: string;
  artist: string;
  year: number;
  coverUrl: string;
  addedBy: string; // User ID
  addedAt: any; // Firestore Timestamp
  spotifyId: string;
}

export interface Group {
  id:string;
  name: string;
  code: string;
  createdBy: string;
  members: string[]; // Array of user IDs
  createdAt: any; // Firestore Timestamp
  memberInfo?: { [key: string]: { username: string; avatarUrl: string; } };
}

export interface RankedAlbum {
  albumId: string;
  rank: number;
  // Also include display data for the album to avoid extra lookups
  title: string;
  artist: string;
  year: number;
  coverUrl: string;
}

export interface YearlyRanking {
    fr: RankedAlbum[];
    inter: RankedAlbum[];
}

export interface GroupRanking {
    rankingsByYear: { [year: number]: YearlyRanking };
    updatedAt: any; // Firestore Timestamp
}

export interface CommunityUserRanking {
  id: string;
  username: string;
  avatarUrl: string;
  rankings: GroupRanking; // Updated to use the new GroupRanking type
}

export interface GlobalRankingData {
  album: Album;
  averageRank: number;
  score: number;
  voters: number;
}
