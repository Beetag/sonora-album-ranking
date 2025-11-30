import { db } from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  query, 
  where, 
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { Album, Group, AlbumLanguage } from "../types";

const GROUPS_COLLECTION = "groups";

// --- 1. GROUP MANAGEMENT ---

/**
 * Generates a unique 6-character alphanumeric code
 */
const generateGroupCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Creates a new group and adds the creator as the first member
 */
export const createGroup = async (name: string, ownerId: string): Promise<string> => {
  // Generate a code (in a real app, we should check for collisions in DB)
  const code = generateGroupCode();
  
  const newGroupRef = doc(collection(db, GROUPS_COLLECTION));
  
  const groupData: Group = {
    id: newGroupRef.id,
    name,
    code,
    ownerId,
    members: [ownerId],
    createdAt: serverTimestamp()
  };

  await setDoc(newGroupRef, groupData);
  
  // Initialize empty pools
  await setDoc(doc(db, GROUPS_COLLECTION, newGroupRef.id, 'pools', 'French'), { albums: [] });
  await setDoc(doc(db, GROUPS_COLLECTION, newGroupRef.id, 'pools', 'International'), { albums: [] });

  return newGroupRef.id;
};

/**
 * Joins a group using its unique code
 */
export const joinGroupByCode = async (code: string, userId: string): Promise<string | null> => {
  const q = query(collection(db, GROUPS_COLLECTION), where("code", "==", code.toUpperCase()));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error("Group not found with this code.");
  }

  const groupDoc = querySnapshot.docs[0];
  const groupData = groupDoc.data() as Group;

  if (groupData.members.includes(userId)) {
    return groupDoc.id; // Already a member
  }

  await updateDoc(groupDoc.ref, {
    members: arrayUnion(userId)
  });

  return groupDoc.id;
};

/**
 * Leaves a group
 */
export const leaveGroup = async (groupId: string, userId: string) => {
  const groupRef = doc(db, GROUPS_COLLECTION, groupId);
  await updateDoc(groupRef, {
    members: arrayRemove(userId)
  });
};

/**
 * Checks if user is a member of the group
 */
export const isGroupMember = async (groupId: string, userId: string): Promise<boolean> => {
  const groupRef = doc(db, GROUPS_COLLECTION, groupId);
  const snapshot = await getDoc(groupRef);
  if (!snapshot.exists()) return false;
  
  const data = snapshot.data() as Group;
  return data.members.includes(userId);
};

/**
 * Returns all groups the user belongs to
 */
export const getUserGroups = async (userId: string): Promise<Group[]> => {
  const q = query(
    collection(db, GROUPS_COLLECTION), 
    where("members", "array-contains", userId)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data() as Group);
};


// --- 2. GROUP POOLS ---

/**
 * Adds an album to the group's shared pool. Prevents duplicates by ID.
 */
export const addAlbumToGroupPool = async (
  groupId: string, 
  category: AlbumLanguage, 
  album: Album
) => {
  const poolRef = doc(db, GROUPS_COLLECTION, groupId, 'pools', category);
  const snapshot = await getDoc(poolRef);

  if (snapshot.exists()) {
    const data = snapshot.data();
    const currentAlbums: Album[] = data.albums || [];
    
    // Check for duplicate by ID
    const exists = currentAlbums.some(a => a.id === album.id);
    if (exists) return; // Do nothing if already exists

    await updateDoc(poolRef, {
      albums: arrayUnion(album)
    });
  } else {
    // Should not happen if created correctly, but fallback
    await setDoc(poolRef, {
      albums: [album]
    });
  }
};

/**
 * Fetches the shared pool for a specific category
 */
export const getGroupPool = async (
  groupId: string, 
  category: AlbumLanguage
): Promise<Album[]> => {
  const poolRef = doc(db, GROUPS_COLLECTION, groupId, 'pools', category);
  const snapshot = await getDoc(poolRef);
  
  if (snapshot.exists()) {
    return snapshot.data().albums as Album[];
  }
  return [];
};


// --- 3. GROUP RANKINGS ---

/**
 * Updates the user's personal ranking within the group
 */
export const updateGroupRanking = async (
  groupId: string, 
  userId: string,
  category: AlbumLanguage,
  rankedAlbums: Album[]
) => {
  const rankingRef = doc(db, GROUPS_COLLECTION, groupId, 'rankings', userId);
  
  // We use setDoc with merge to allow updating one category without wiping the other
  await setDoc(rankingRef, {
    [category.toLowerCase()]: rankedAlbums,
    userId,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

/**
 * Gets a specific user's ranking in a group
 */
export const getGroupRanking = async (
  groupId: string, 
  userId: string
): Promise<{ french: Album[], international: Album[] }> => {
  const rankingRef = doc(db, GROUPS_COLLECTION, groupId, 'rankings', userId);
  const snapshot = await getDoc(rankingRef);

  if (snapshot.exists()) {
    const data = snapshot.data();
    return {
      french: data.french || [],
      international: data.international || []
    };
  }
  
  return { french: [], international: [] };
};

/**
 * Gets all rankings for all members in a group (for the community view within the group)
 */
export const getAllGroupRankings = async (groupId: string): Promise<any[]> => {
  const rankingsRef = collection(db, GROUPS_COLLECTION, groupId, 'rankings');
  const snapshot = await getDocs(rankingsRef);
  
  return snapshot.docs.map(doc => ({
    userId: doc.id,
    ...doc.data()
  }));
};
