import { db } from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  Timestamp 
} from "firebase/firestore";
import { UserRanking, CommunityUserRanking } from "../types";

const COLLECTION_NAME = "rankings";

// Helper to generate a consistent ID for the document: userId_year
const getDocId = (userId: string, year: number) => `${userId}_${year}`;

export const subscribeToUserRanking = (
  userId: string, 
  year: number, 
  onUpdate: (data: UserRanking | null) => void
) => {
  const docRef = doc(db, COLLECTION_NAME, getDocId(userId, year));

  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      // Transform Firestore data to UserRanking
      onUpdate({
        year: data.year,
        french: data.french || { ranked: [], pool: [] },
        international: data.international || { ranked: [], pool: [] }
      });
    } else {
      onUpdate(null);
    }
  });
};

export const saveUserRanking = async (
  userId: string, 
  ranking: UserRanking,
  userProfile: { username: string; avatarUrl: string }
) => {
  const docRef = doc(db, COLLECTION_NAME, getDocId(userId, ranking.year));
  
  await setDoc(docRef, {
    userId,
    year: ranking.year,
    french: ranking.french,
    international: ranking.international,
    updatedAt: Timestamp.now(),
    username: userProfile.username,
    avatarUrl: userProfile.avatarUrl
  }, { merge: true });
};

export const getCommunityRankings = async (year: number): Promise<CommunityUserRanking[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("year", "==", year)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.userId,
        username: data.username || "Anonymous",
        avatarUrl: data.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
        rankings: {
          french: data.french?.ranked || [],
          international: data.international?.ranked || []
        }
      };
    });
  } catch (error) {
    console.error("Error fetching community rankings:", error);
    return [];
  }
};