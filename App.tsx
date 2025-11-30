import React, { useState, useEffect } from 'react';
import { SearchBar } from './components/SearchBar';
import { RankingView } from './components/RankingView';
import { CommunityView } from './components/CommunityView';
import { GroupsView } from './components/GroupsView';
import { Album, UserRanking } from './types';
import { LayoutGrid, Users, Calendar, Music2, Loader2, Save, CheckCircle2, LogOut, LogIn, AlertCircle } from 'lucide-react';
import { auth, signInWithGoogle, logout } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { subscribeToUserRanking, saveUserRanking } from './services/rankingService';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

const App: React.FC = () => {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [category, setCategory] = useState<'French' | 'International'>('French');
  const [viewMode, setViewMode] = useState<'personal' | 'community' | 'groups'>('personal');
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  // State for rankings
  const [currentRanking, setCurrentRanking] = useState<UserRanking>({
    year: CURRENT_YEAR,
    french: { ranked: [], pool: [] },
    international: { ranked: [], pool: [] }
  });

  // State for Save functionality
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for Errors
  const [authError, setAuthError] = useState<{title: string, message: string} | null>(null);

  // 1. Handle Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Firebase Data for Current Year (Only if logged in)
  useEffect(() => {
    if (!user) {
        return;
    }

    // When year or user changes, we reset dirty state because we are loading fresh data
    setHasUnsavedChanges(false);

    const unsubscribe = subscribeToUserRanking(user.uid, year, (data) => {
      if (data) {
        setCurrentRanking(data);
      } else {
        // Reset if no data exists yet for this year
        setCurrentRanking({
          year,
          french: { ranked: [], pool: [] },
          international: { ranked: [], pool: [] }
        });
      }
    });

    return () => unsubscribe();
  }, [user, year]);

  // 3. Handle Updates (Manual Save Mode)
  const updateRankingData = (
    type: 'ranked' | 'pool', 
    items: Album[]
  ) => {
    const targetCategory = category.toLowerCase() as 'french' | 'international';
    
    // Optimistic Update
    setCurrentRanking(prev => ({
      ...prev,
      [targetCategory]: {
        ...prev[targetCategory],
        [type]: items
      }
    }));
    
    setHasUnsavedChanges(true);
  };

  // 4. Handle Atomic Updates for Moving Items between Lists
  const handleListsUpdate = (newRanked: Album[], newPool: Album[]) => {
    const targetCategory = category.toLowerCase() as 'french' | 'international';
    
    setCurrentRanking(prev => ({
      ...prev,
      [targetCategory]: {
        ranked: newRanked,
        pool: newPool
      }
    }));
    
    setHasUnsavedChanges(true);
  };

  const handleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Login failed", error);
      let title = "Login Failed";
      let message = error.message;

      if (error.code === 'auth/configuration-not-found') {
        title = "Configuration Error";
        message = "Google Sign-In is not enabled in your Firebase Console.\n\nPlease go to Firebase Console > Authentication > Sign-in method, and enable the 'Google' provider.";
      } else if (error.code === 'auth/unauthorized-domain') {
        title = "Unauthorized Domain";
        // Dynamic detection of current domain to help user
        message = `The current domain (${window.location.hostname}) is not authorized for OAuth operations.\n\nPlease add this domain in the Firebase Console under Authentication > Settings > Authorized domains.`;
      } else if (error.code === 'auth/popup-closed-by-user') {
        return; // Ignore if user just closed the popup
      }

      setAuthError({ title, message });
    }
  };

  const handleSave = async () => {
    if (!user) {
      // If guest tries to save, prompt login
      handleLogin();
      return;
    }
    
    setIsSaving(true);
    try {
      await saveUserRanking(user.uid, currentRanking, {
        username: user.displayName || 'Anonymous',
        avatarUrl: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save ranking", error);
      setAuthError({
        title: "Save Failed",
        message: "Could not save your ranking. Please check your internet connection."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAlbum = (album: Album) => {
    const targetCategory = category.toLowerCase() as 'french' | 'international';
    const categoryData = currentRanking[targetCategory];
      
    // Prevent duplicates
    if (categoryData.pool.find(a => a.id === album.id) || categoryData.ranked.find(a => a.id === album.id)) {
      return;
    }

    const newPool = [album, ...categoryData.pool];
    updateRankingData('pool', newPool);
  };

  const handleLogout = async () => {
    await logout();
    // Reset local state to empty default
    setCurrentRanking({
      year: CURRENT_YEAR,
      french: { ranked: [], pool: [] },
      international: { ranked: [], pool: [] }
    });
    setHasUnsavedChanges(false);
    if (viewMode === 'groups') setViewMode('personal');
  };

  // Callback when a group is selected from GroupsView
  const handleSelectGroup = (groupId: string) => {
    // For now, we just log it or maybe setup future state.
    // The requirement was just to "see the groups".
    console.log("Selected Group:", groupId);
    // Future: setViewMode('group-detail'); setActiveGroupId(groupId);
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white">
        <Loader2 className="animate-spin text-green-500" size={48} />
      </div>
    );
  }

  // --- MAIN APP (Accessible to Guests and Users) ---
  return (
    <div className="min-h-screen bg-[#121212] text-white pb-20">
      {/* Header */}
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
               onClick={() => setViewMode('personal')}
               className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                 viewMode === 'personal' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
               }`}
             >
               <LayoutGrid size={16} />
               <span className="hidden sm:inline">My Rankings</span>
             </button>
             <button
               onClick={() => setViewMode('community')}
               className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                 viewMode === 'community' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
               }`}
             >
               <Users size={16} />
               <span className="hidden sm:inline">Community</span>
             </button>
             {/* Groups Button - Visible to everyone for testing */}
             <button
               onClick={() => setViewMode('groups')}
               className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                 viewMode === 'groups' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
               }`}
             >
               <Users size={16} />
               <span className="hidden sm:inline">Groups</span>
             </button>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4">
             {/* User Profile / Login Button */}
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {authError && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 max-w-2xl mx-auto">
             <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
              <div>
                <h3 className="font-bold text-red-400 text-sm">{authError.title}</h3>
                <p className="text-red-300 text-xs mt-1 whitespace-pre-wrap">{authError.message}</p>
              </div>
          </div>
        )}

        {viewMode === 'groups' ? (
          <GroupsView user={user} onSelectGroup={handleSelectGroup} />
        ) : (
          <>
            {/* Controls Toolbar (Only for Rankings/Community) */}
            <div className="grid grid-cols-2 md:flex md:items-center md:justify-between gap-4 mb-8">
              
              {/* Year Selector */}
              <div className="col-start-1 md:order-1">
                <div className="relative inline-block w-full md:w-auto">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none" size={16} />
                  <select 
                    value={year} 
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full md:w-auto pl-10 pr-10 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-500/50 outline-none hover:border-zinc-700 transition-colors appearance-none cursor-pointer text-white"
                  >
                      {YEARS.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Category Tabs */}
              <div className="col-span-2 row-start-1 md:col-span-1 md:row-start-auto md:order-2 flex justify-center">
                  <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-2xl w-full md:w-auto">
                    <button
                      onClick={() => setCategory('French')}
                      className={`flex-1 md:flex-none px-4 py-2 md:px-8 md:py-2.5 rounded-xl text-sm font-bold transition-all ${
                        category === 'French' 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/20' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      French
                    </button>
                    <button
                      onClick={() => setCategory('International')}
                      className={`flex-1 md:flex-none px-4 py-2 md:px-8 md:py-2.5 rounded-xl text-sm font-bold transition-all ${
                        category === 'International' 
                          ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-900/20' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      International
                    </button>
                  </div>
              </div>

              {/* Save Button */}
              <div className="col-start-2 md:order-3 flex justify-end">
                 {viewMode === 'personal' ? (
                     <button
                       onClick={handleSave}
                       disabled={isSaving || (!user && !hasUnsavedChanges)} 
                       className={`
                         flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg whitespace-nowrap
                         ${hasUnsavedChanges
                           ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20' 
                           : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:border-zinc-600 hover:text-zinc-300'}
                       `}
                       title={!user ? "Login to save" : "Save changes"}
                     >
                       {isSaving ? (
                         <Loader2 size={18} className="animate-spin" />
                       ) : hasUnsavedChanges ? (
                         <Save size={18} />
                       ) : (
                         <CheckCircle2 size={18} />
                       )}
                       <span>
                         {isSaving ? 'Saving' : hasUnsavedChanges ? 'Save' : 'Saved'}
                       </span>
                     </button>
                 ) : (
                   <div className="w-[100px] hidden md:block" /> /* Spacer */
                 )}
              </div>
            </div>

            {viewMode === 'personal' ? (
              <>
                <SearchBar year={year} category={category} onAddAlbum={handleAddAlbum} />
                <div className="h-[calc(100vh-350px)] min-h-[500px]">
                  <RankingView 
                    category={category}
                    ranked={category === 'French' ? currentRanking.french.ranked : currentRanking.international.ranked}
                    pool={category === 'French' ? currentRanking.french.pool : currentRanking.international.pool}
                    onUpdateRanked={(items) => updateRankingData('ranked', items)}
                    onUpdatePool={(items) => updateRankingData('pool', items)}
                    onListsUpdate={handleListsUpdate}
                  />
                </div>
              </>
            ) : (
              <CommunityView year={year} category={category} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;