import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Group } from '../types';
import { getUserGroups, createGroup, joinGroupByCode } from '../services/groupService';
import { Plus, Users, Hash, Copy, LogIn, Loader2, X, Check, TestTube } from 'lucide-react';

interface GroupsViewProps {
  user: User | null;
  onSelectGroup: (groupId: string) => void;
}

// Mock Data for Testing without Auth
const MOCK_GROUPS: Group[] = [
  { 
    id: 'mock-1', 
    name: 'Frontend Test Group', 
    code: 'TEST01', 
    ownerId: 'mock-user', 
    members: ['mock-user', 'other-user'], 
    createdAt: new Date() 
  },
  { 
    id: 'mock-2', 
    name: 'Sonora Dev Team', 
    code: 'DEV999', 
    ownerId: 'other-user', 
    members: ['mock-user'], 
    createdAt: new Date() 
  }
];

export const GroupsView: React.FC<GroupsViewProps> = ({ user, onSelectGroup }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // Form States
  const [newGroupName, setNewGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchGroups();
    } else {
      // Load Mock Data for Guest/Test Mode
      setTimeout(() => {
        setGroups(MOCK_GROUPS);
        setLoading(false);
      }, 500);
    }
  }, [user]);

  const fetchGroups = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userGroups = await getUserGroups(user.uid);
      setGroups(userGroups);
    } catch (e) {
      console.error("Error fetching groups:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    
    setActionLoading(true);
    setError(null);
    
    if (!user) {
        // Mock Implementation
        setTimeout(() => {
             const newGroup: Group = {
                id: `mock-${Date.now()}`,
                name: newGroupName,
                code: 'MOCK' + Math.floor(Math.random() * 100),
                ownerId: 'guest',
                members: ['guest'],
                createdAt: new Date()
            };
            setGroups(prev => [...prev, newGroup]);
            setNewGroupName('');
            setShowCreateModal(false);
            setActionLoading(false);
        }, 800);
        return;
    }

    try {
      await createGroup(newGroupName.trim(), user.uid);
      await fetchGroups();
      setNewGroupName('');
      setShowCreateModal(false);
    } catch (e) {
      console.error(e);
      setError("Failed to create group. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setActionLoading(true);
    setError(null);

    if (!user) {
        // Mock Implementation
        setTimeout(() => {
            if (joinCode === 'ERROR') {
                setError("Mock Error: Invalid Code");
            } else {
                const newGroup: Group = {
                    id: `mock-joined-${Date.now()}`,
                    name: `Joined Group (${joinCode})`,
                    code: joinCode,
                    ownerId: 'someone-else',
                    members: ['guest', 'owner'],
                    createdAt: new Date()
                };
                setGroups(prev => [...prev, newGroup]);
                setJoinCode('');
                setShowJoinModal(false);
            }
            setActionLoading(false);
        }, 800);
        return;
    }

    try {
      await joinGroupByCode(joinCode.trim(), user.uid);
      await fetchGroups();
      setJoinCode('');
      setShowJoinModal(false);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to join group. Check the code and try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-green-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
            <Users size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                My Groups
                {!user && <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/30 flex items-center gap-1"><TestTube size={10} /> Test Mode</span>}
            </h2>
            <p className="text-zinc-400">Collaborate with friends on rankings</p>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-medium"
          >
            <LogIn size={18} />
            Join Group
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors font-medium shadow-lg shadow-indigo-900/20"
          >
            <Plus size={18} />
            Create Group
          </button>
        </div>
      </div>

      {/* Group List */}
      {groups.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/30">
          <Users className="mx-auto text-zinc-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-white">No Groups Yet</h3>
          <p className="text-zinc-500 mt-1 max-w-sm mx-auto">
            Create a new group to invite friends, or join an existing one with a code.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div 
              key={group.id} 
              className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-zinc-800 rounded-xl text-white font-bold text-lg">
                  {group.name.substring(0, 2).toUpperCase()}
                </div>
                <div 
                  className="flex items-center gap-2 px-2 py-1 bg-zinc-800/50 rounded-lg border border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors"
                  onClick={() => copyToClipboard(group.code)}
                  title="Copy Join Code"
                >
                  <Hash size={14} className="text-zinc-500" />
                  <span className="text-sm font-mono text-zinc-300">{group.code}</span>
                  {copiedCode === group.code ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-zinc-500" />}
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2 truncate">{group.name}</h3>
              
              <div className="flex items-center gap-2 text-zinc-400 text-sm mb-6">
                <Users size={16} />
                <span>{group.members.length} member{group.members.length !== 1 ? 's' : ''}</span>
              </div>

              <button 
                onClick={() => onSelectGroup(group.id)}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Open Group
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-xl font-bold text-white mb-1">Create a Group</h3>
            <p className="text-zinc-400 text-sm mb-6">Start a new collection to rank with friends.</p>
            
            <form onSubmit={handleCreate}>
              <div className="mb-6">
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Group Name</label>
                <input 
                  type="text" 
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. The Music Club"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  autoFocus
                />
              </div>
              
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

              <button 
                type="submit" 
                disabled={actionLoading || !newGroupName.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl font-bold transition-colors flex justify-center items-center gap-2"
              >
                {actionLoading && <Loader2 className="animate-spin" size={18} />}
                Create Group
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
             <button 
              onClick={() => setShowJoinModal(false)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-xl font-bold text-white mb-1">Join a Group</h3>
            <p className="text-zinc-400 text-sm mb-6">Enter the 6-character code shared by your friend.</p>
            
            <form onSubmit={handleJoin}>
              <div className="mb-6">
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Group Code</label>
                <input 
                  type="text" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. XY99WZ"
                  maxLength={6}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 font-mono text-center tracking-widest text-lg uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  autoFocus
                />
              </div>
              
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

              <button 
                type="submit" 
                disabled={actionLoading || joinCode.length < 6}
                className="w-full py-3 bg-zinc-100 hover:bg-white disabled:opacity-50 disabled:hover:bg-zinc-100 text-black rounded-xl font-bold transition-colors flex justify-center items-center gap-2"
              >
                {actionLoading && <Loader2 className="animate-spin" size={18} />}
                Join Group
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};