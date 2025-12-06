import React, { useState, useEffect, useCallback } from 'react';
import { SearchBar } from './components/SearchBar';
import { RankingView } from './components/RankingView';
import { CommunityView } from './components/CommunityView';
import { GroupsView } from './components/GroupsView';
import { Album, Group, GroupRanking, PoolAlbum, RankedAlbum, AlbumSubcollection } from './types';
import { LayoutGrid, Users, Calendar, Music2, Loader2, Save, CheckCircle2, LogOut, LogIn, ArrowLeft } from 'lucide-react';
import { auth, signInWithGoogle, logout } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  getUserGroups,
  getGroupPool,
  addAlbumToPool,
  subscribeToGroupUserRanking,
  updateUserGroupRanking
} from './services/groupService';
import { Toaster, toast } from 'react-hot-toast';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

// Auth Guard Component
const AuthGuard: React.FC<{
  user: User | null;
  handleLogin: () => void;
  title: string;
  message: string;
  children: React.ReactNode;
}> = ({ user, handleLogin, title, message, children }) => {
  if (!user) {
    return (
      <div className="text-center py-20 max-w-lg mx-auto bg-zinc-900/50 rounded-2xl p-8 border border-zinc-800">
        <Users size={48} className="mx-auto text-green-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2 text-white">{title}</h2>
        <p className="text-zinc-400 mb-8">{message}</p>
        <button
          onClick={handleLogin}
          className="flex items-center gap-2 text-lg font-bold bg-green-600 text-white hover:bg-green-500 px-6 py-3 rounded-lg transition-colors mx-auto shadow-lg shadow-green-900/20"
        >
          <LogIn size={20} />
          Sign In with Google
        </button>
      </div>
    );
  }

  return <>{children}</>;
};


const App: React.FC = () => {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [category, setCategory] = useState<'French' | 'International'>('French');
  const [viewMode, setViewMode] = useState<'ranking' | 'community'>('ranking');
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [currentRanking, setCurrentRanking] = useState<GroupRanking>({ fr: [], inter: [] });
  const [groupPool, setGroupPool] = useState<PoolAlbum[]>([]);

  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [rankingSelectedGroup, setRankingSelectedGroup] = useState<Group | null>(null);
  const [communitySelectedGroup, setCommunitySelectedGroup] = useState<Group | null>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleViewChange = (newView: 'ranking' | 'community') => {
    setCommunitySelectedGroup(null);
    setViewMode(newView);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      if (!currentUser) {
        setRankingSelectedGroup(null);
        setCommunitySelectedGroup(null);
        setUserGroups([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      getUserGroups(user.uid).then(setUserGroups);
    } else {
      setUserGroups([]);
    }
  }, [user]);

  const subcollectionId = category === 'French' ? 'fr' : 'inter';

  useEffect(() => {
    if (!user || !rankingSelectedGroup) {
      setGroupPool([]);
      setCurrentRanking({ fr: [], inter: [] });
      return;
    }

    let isMounted = true;

    getGroupPool(rankingSelectedGroup.id, subcollectionId).then(pool => {
      if (isMounted) setGroupPool(pool);
    });

    const unsubscribe = subscribeToGroupUserRanking(rankingSelectedGroup.id, user.uid, (ranking) => {
       if (isMounted && ranking) {
         const newRankingState: GroupRanking = { fr: ranking.fr || [], inter: ranking.inter || [] };
         setCurrentRanking(newRankingState);
         setHasUnsavedChanges(false);
       }
    });

    return () => { 
      isMounted = false;
      unsubscribe(); 
    };
  }, [user, rankingSelectedGroup, subcollectionId]);

  const handleAddAlbum = useCallback((album: Album) => {
    if (!user || !rankingSelectedGroup) return;

    const poolAlbum: Omit<PoolAlbum, 'id' | 'addedAt' | 'addedBy'> = { 
        title: album.title, 
        artist: album.artist, 
        year: album.year, 
        coverUrl: album.coverUrl, 
        spotifyId: album.id 
    };
    
    const addPromise = addAlbumToPool(rankingSelectedGroup.id, subcollectionId, poolAlbum, user.uid);

    toast.promise(addPromise, {
        loading: `Adding "${album.title}"...`,
        success: (newAlbumId) => {
            setGroupPool(prevPool => [...prevPool, { ...poolAlbum, id: newAlbumId, addedAt: new Date(), addedBy: user.uid }]);
            return `"${album.title}" added to pool!`
        },
        error: (err) => err.message || 'Failed to add album.',
    });
  }, [user, rankingSelectedGroup, subcollectionId]);

  const handleSave = async () => {
    if (!user || !rankingSelectedGroup) return;
    setIsSaving(true);

    const savePromise = updateUserGroupRanking(rankingSelectedGroup.id, user, { 
      [subcollectionId]: currentRanking[subcollectionId] 
    });

    toast.promise(savePromise, {
      loading: 'Saving ranking...',
      success: () => {
        setHasUnsavedChanges(false);
        setIsSaving(false);
        return 'Ranking saved successfully!';
      },
      error: (err) => {
        setIsSaving(false);
        return `Save failed: ${err.message}`;
      }
    });
  };

  const updateRankedList = (newRanked: RankedAlbum[]) => {
    setCurrentRanking(prev => {
        const otherYears = (prev[subcollectionId] || []).filter(item => item.year !== year);
        const newCategoryList = [...otherYears, ...newRanked];
        return { ...prev, [subcollectionId]: newCategoryList };
    });
    setHasUnsavedChanges(true);
  }

  const handleLogin = async () => {
    try { 
      await signInWithGoogle(); 
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') return;
      toast.error(`Login Failed: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    setRankingSelectedGroup(null);
    setCommunitySelectedGroup(null);
    setHasUnsavedChanges(false);
    toast.success('Signed out successfully.');
  };
  
  const handleChangeGroup = () => {
    setRankingSelectedGroup(null);
    setHasUnsavedChanges(false);
  };

  const rankedList = (currentRanking[subcollectionId] || []).filter(item => item.year === year);
  const poolList = groupPool.filter(poolAlbum => 
    !rankedList.some(rankedAlbum => rankedAlbum.albumId === poolAlbum.id) && poolAlbum.year === year
  );

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white">
        <Loader2 className="animate-spin text-green-500" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white pb-20">
       <Toaster
        position="bottom-right"
        reverseOrder={false}
        toastOptions={{
          style: {
            background: '#27272a',
            color: '#fff',
            border: '1px solid #3f3f46'
          },
        }}
      />
      <header className="sticky top-0 z-50 bg-[#121212]/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-900/20">
               <Music2 size={24} />
             </div>
             <h1 className="text-2xl font-bold tracking-tight hidden md:block">Sonora</h1>
          </div>

          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 overflow-x-auto max-w-[200px] sm:max-w-none no-scrollbar">
             <button
               onClick={() => handleViewChange('ranking')}
               className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                 viewMode === 'ranking' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
               }`}
             >
               <LayoutGrid size={16} />
               <span className="hidden sm:inline">My Rankings</span>
             </button>
             <button
               onClick={() => handleViewChange('community')}
               className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                 viewMode === 'community' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
               }`}
             >
               <Users size={16} />
               <span className="hidden sm:inline">Community</span>
             </button>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4">
             <div className="flex items-center gap-2 pl-2">
               {user ? (
                 <>
                   <img 
                     src={user.photoURL || ''} 
                     alt={user.displayName || 'User'} 
                     className="w-9 h-9 rounded-full border border-zinc-700 hidden sm:block"
                     title={user.displayName || 'User'}
                   />
                   <button 
                    onClick={handleLogout}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Sign Out"
                   >
                     <LogOut size={20} />
                   </button>
                 </>
               ) : (
                 <button
                   onClick={handleLogin}
                   className="flex items-center gap-2 text-sm font-bold bg-white text-zinc-900 hover:bg-zinc-200 px-3 py-2 rounded-lg transition-colors"
                 >
                   <LogIn size={16} />
                   <span className="hidden md:inline">Sign In</span>
                 </button>
               )}
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {viewMode === 'ranking' && (
           <AuthGuard
            user={user}
            handleLogin={handleLogin}
            title="Access Your Rankings"
            message="Please sign in to create, view, and manage your album rankings within your groups."
           >
            {!rankingSelectedGroup ? (
              <GroupsView user={user} onSelectGroup={setRankingSelectedGroup} />
            ) : (
              <>
                <div className="md:flex md:items-center md:justify-between gap-4 mb-8">
                  
                  <div className="flex-shrink-0 mb-4 md:mb-0">
                    <button
                      onClick={handleChangeGroup}
                      className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                      <ArrowLeft size={16} />
                      Change Group
                    </button>
                  </div>

                  <div className="flex flex-col gap-4 flex-grow">
                    {/* Mobile: French/International buttons (full width) */}
                    <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-2xl w-full md:hidden">
                      <button
                        onClick={() => setCategory('French')}
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all w-1/2 ${
                          category === 'French' 
                            ? 'bg-blue-600 text-white' 
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        French
                      </button>
                      <button
                        onClick={() => setCategory('International')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all w-1/2 ${
                          category === 'International' 
                            ? 'bg-purple-600 text-white' 
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        International
                      </button>
                    </div>

                    {/* Mobile: Calendar + Save button */}
                    <div className="flex items-center gap-2 w-full md:hidden">
                      <div className="relative w-1/2">
                        <select
                          value={year}
                          onChange={(e) => setYear(parseInt(e.target.value))}
                          className="w-full appearance-none bg-zinc-800 border border-zinc-700 rounded-xl py-2.5 pl-4 pr-8 text-sm font-medium text-white hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                        >
                          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400">
                          <Calendar size={16} />
                        </div>
                      </div>

                      <div className='w-1/2'>
                        <button
                          onClick={handleSave}
                          disabled={isSaving || !hasUnsavedChanges} 
                          className={`
                            w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg whitespace-nowrap
                            ${
                              hasUnsavedChanges
                                ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20' 
                                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                            }
                          `}
                        >
                          {isSaving ? <Loader2 size={18} className="animate-spin" /> : (hasUnsavedChanges ? <Save size={18} /> : <CheckCircle2 size={18} />)}
                          <span className="hidden sm:inline">{isSaving ? 'Saving' : hasUnsavedChanges ? 'Save' : 'Saved'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Desktop: Calendar + French/International (centered) + Save */}
                    <div className="hidden md:flex md:items-center md:justify-end gap-2 w-full">
                      <div className="relative flex-shrink-0">
                        <select
                          value={year}
                          onChange={(e) => setYear(parseInt(e.target.value))}
                          className="w-full appearance-none bg-zinc-800 border border-zinc-700 rounded-xl py-2.5 pl-4 pr-8 text-sm font-medium text-white hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                        >
                          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400">
                          <Calendar size={16} />
                        </div>
                      </div>

                      <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-2xl mx-auto">
                        <button
                          onClick={() => setCategory('French')}
                          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                            category === 'French' 
                              ? 'bg-blue-600 text-white' 
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          French
                        </button>
                        <button
                          onClick={() => setCategory('International')}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            category === 'International' 
                              ? 'bg-purple-600 text-white' 
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          International
                        </button>
                      </div>

                      <div className='flex-shrink-0'>
                        <button
                          onClick={handleSave}
                          disabled={isSaving || !hasUnsavedChanges} 
                          className={`
                            flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg whitespace-nowrap
                            ${
                              hasUnsavedChanges
                                ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20' 
                                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                            }
                          `}
                        >
                          {isSaving ? <Loader2 size={18} className="animate-spin" /> : (hasUnsavedChanges ? <Save size={18} /> : <CheckCircle2 size={18} />)}
                          <span className="hidden sm:inline">{isSaving ? 'Saving' : hasUnsavedChanges ? 'Save' : 'Saved'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <SearchBar year={year} category={category} onAddAlbum={handleAddAlbum} />
                <div className="h-[calc(100vh-350px)] min-h-[500px]">
                  <RankingView 
                    category={category}
                    ranked={rankedList.map(r => ({ ...r, id: r.albumId }))}
                    pool={poolList.map(p => ({ ...p, language: category, id: p.id }))}
                    onUpdateRanked={(items) => {
                      const newRanked = items.map((item, index) => ({
                        albumId: item.id,
                        rank: index + 1,
                        title: item.title,
                        artist: item.artist,
                        year: item.year,
                        coverUrl: item.coverUrl,
                      }));
                      updateRankedList(newRanked);
                    }}
                  />
                </div>
              </>
            )}
           </AuthGuard>
        )}

        {viewMode === 'community' && (
           <AuthGuard
            user={user}
            handleLogin={handleLogin}
            title="Join the Community"
            message="Log in to see what other members of your groups are ranking and share your own taste."
           >
            <CommunityView 
              user={user} 
              groups={userGroups} 
              selectedGroup={communitySelectedGroup}
              onSelectGroup={setCommunitySelectedGroup}
              onClearGroup={() => setCommunitySelectedGroup(null)}
            />
           </AuthGuard>
        )}
      </main>
    </div>
  );
};

export default App;
