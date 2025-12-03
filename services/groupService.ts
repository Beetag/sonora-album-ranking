import { db } from './firebase';
import {
  collection, getDocs, query, where, doc, setDoc, getDoc, addDoc, onSnapshot, writeBatch, collectionGroup
} from 'firebase/firestore';
import { Group, GroupRanking, PoolAlbum, AlbumSubcollection, CommunityUserRanking } from '../types';
import { User } from 'firebase/auth';

const GROUPS_COLLECTION = 'groups';

// --- Functions for managing group membership and details ---

export const getUserGroups = async (userId: string): Promise<Group[]> => {
  const groupsRef = collection(db, GROUPS_COLLECTION);
  const q = query(groupsRef, where('members', 'array-contains', userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
};

const createInitialRankingDoc = (user: User, groupId: string) => ({
  fr: [],
  inter: [],
  updatedAt: new Date(),
  userInfo: {
    username: user.displayName || 'Anonymous',
    avatarUrl: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`,
    groupId: groupId
  }
});

export const createGroup = async (groupName: string, user: User): Promise<Group> => {
  if (!groupName.trim()) throw new Error("Group name cannot be empty.");

  const batch = writeBatch(db);
  const newGroupRef = doc(collection(db, GROUPS_COLLECTION));

  batch.set(newGroupRef, {
    name: groupName,
    createdBy: user.uid,
    createdAt: new Date(),
    members: [user.uid],
    code: Math.random().toString(36).substring(2, 8).toUpperCase(),
  });

  const rankingDocRef = doc(db, GROUPS_COLLECTION, newGroupRef.id, 'rankings', user.uid);
  batch.set(rankingDocRef, createInitialRankingDoc(user, newGroupRef.id));

  await batch.commit();

  const docSnap = await getDoc(newGroupRef);
  return { id: docSnap.id, ...docSnap.data() } as Group;
};

export const joinGroupByCode = async (code: string, user: User): Promise<void> => {
  if (!code || code.length !== 6) throw new Error("Invalid code format.");

  const groupsRef = collection(db, GROUPS_COLLECTION);
  const q = query(groupsRef, where("code", "==", code));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) throw new Error("Group not found.");

  const groupDoc = querySnapshot.docs[0];
  const groupData = groupDoc.data() as Group;

  if (groupData.members.includes(user.uid)) return;

  const batch = writeBatch(db);
  batch.update(groupDoc.ref, { members: [...groupData.members, user.uid] });

  const rankingDocRef = doc(db, GROUPS_COLLECTION, groupDoc.id, 'rankings', user.uid);
  batch.set(rankingDocRef, createInitialRankingDoc(user, groupDoc.id));

  await batch.commit();
};

// --- Functions for Group Album Pools ---

const getPoolCollectionName = (subcollection: AlbumSubcollection) => `${subcollection}_pool`;

export const getGroupPool = async (groupId: string, subcollection: AlbumSubcollection): Promise<PoolAlbum[]> => {
  const poolColName = getPoolCollectionName(subcollection);
  const poolRef = collection(db, GROUPS_COLLECTION, groupId, poolColName);
  const querySnapshot = await getDocs(poolRef);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PoolAlbum));
};

export const addAlbumToPool = async (groupId: string, subcollection: AlbumSubcollection, album: Omit<PoolAlbum, 'id' | 'addedAt' | 'addedBy'>, userId: string): Promise<string> => {
  const poolColName = getPoolCollectionName(subcollection);
  const poolRef = collection(db, GROUPS_COLLECTION, groupId, poolColName);
  const albumDocRef = doc(poolRef, album.spotifyId);

  const docSnap = await getDoc(albumDocRef);
  if (docSnap.exists()) {
    throw new Error('Album already exists in this pool.');
  }

  await setDoc(albumDocRef, { ...album, addedBy: userId, addedAt: new Date() });
  return album.spotifyId;
};

// --- Functions for Group-Specific User Rankings ---

export const subscribeToGroupUserRanking = (groupId: string, userId: string, callback: (data: GroupRanking | null) => void) => {
  const rankingDocRef = doc(db, GROUPS_COLLECTION, groupId, 'rankings', userId);
  return onSnapshot(rankingDocRef, (doc) => {
    callback(doc.exists() ? doc.data() as GroupRanking : null);
  });
};

// THIS IS THE CORRECTED FUNCTION
export const updateUserGroupRanking = async (groupId: string, user: User, rankingData: Partial<GroupRanking>): Promise<void> => {
  const rankingDocRef = doc(db, GROUPS_COLLECTION, groupId, 'rankings', user.uid);
  
  // This object ensures the critical userInfo field is ALWAYS present on save.
  const dataToMerge = {
    ...rankingData,
    updatedAt: new Date(),
    userInfo: {
        username: user.displayName || 'Anonymous',
        avatarUrl: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`,
        groupId: groupId
    }
  };

  await setDoc(rankingDocRef, dataToMerge, { merge: true });
};

// --- Function for Community View ---

export const getCommunityRankings = async (groupIds: string[]): Promise<CommunityUserRanking[]> => {
  if (groupIds.length === 0) return [];

  const rankingsQuery = query(collectionGroup(db, 'rankings'), where('userInfo.groupId', 'in', groupIds));
  const querySnapshot = await getDocs(rankingsQuery);
  
  const results: CommunityUserRanking[] = [];
  querySnapshot.forEach(doc => {
    const data = doc.data() as GroupRanking & { userInfo: { username: string, avatarUrl: string } };
    if(data.userInfo){
        results.push({
            id: doc.id,
            username: data.userInfo.username,
            avatarUrl: data.userInfo.avatarUrl,
            rankings: {
                fr: data.fr || [],
                inter: data.inter || [],
                updatedAt: data.updatedAt
            }
        });
    }
  });

  return results;
};
