export type AlbumLanguage = 'French' | 'International';

export interface Album {
  id: string;
  title: string;
  artist: string;
  year: number;
  language: AlbumLanguage;
  coverUrl: string;
}

export interface UserRanking {
  year: number;
  french: {
    ranked: Album[];
    pool: Album[];
  };
  international: {
    ranked: Album[];
    pool: Album[];
  };
}

export interface CommunityUserRanking {
  id: string;
  username: string;
  avatarUrl: string;
  rankings: {
    french: Album[];
    international: Album[];
  };
}

export interface GlobalRankingData {
  album: Album;
  averageRank: number;
  score: number;
  voters: number;
}

export interface Group {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  members: string[]; // Array of user IDs
  createdAt: any; // Firestore Timestamp
}

export interface GroupPool {
  albums: Album[];
}
