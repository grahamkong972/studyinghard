import { useState, useEffect, useRef } from 'react';
import { BookOpen, RotateCw, X, LogOut } from 'lucide-react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from './firebase/firebaseConfig';
import { useToast } from './context/ToastContext';
import AuthPage from './components/auth/AuthPage';
import Sidebar from './components/layout/Sidebar';
import NameModal from './components/modals/NameModal';
import FlashcardStudy from './components/study/FlashcardStudy';
import ExamRunner from './components/study/ExamRunner';
import SAQMode from './components/study/SAQMode';
import ModuleDashboard from './views/ModuleDashboard';
import FolderDashboard from './views/FolderDashboard';

function AppInner() {
    const toast = useToast();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [folders, setFolders] = useState([]);
    const [decks, setDecks] = useState([]); // This holds all module data
    const [userProfile, setUserProfile] = useState({ age: '', degree: '' });
    const [viewMode, setViewMode] = useState('deck');
    const [activeId, setActiveId] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [nameModal, setNameModal] = useState({ isOpen: false, type: '', folder: null, value: '' });
    const hasInitializedActiveId = useRef(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        hasInitializedActiveId.current = false;
        if (!user) {
            setFolders([]);
            setDecks([]);
            setUserProfile({ age: '', degree: '', subscription: { tier: 'free', credits: 180 } });
            setActiveId(null);
            return;
        }

        const userDocRef = doc(db, "users", user.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const fetchedFolders = data.folders || [];
                const fetchedDecks = data.decks || [];
                setFolders(fetchedFolders);
                setDecks(fetchedDecks);
                setUserProfile({
                    age: data.profile?.age || '',
                    degree: data.profile?.degree || '',
                    subscription: data.subscription || { tier: 'free', credits: 180 }
                });

                // Only set the initial active item once per login — use a ref so the
                // stale closure doesn't re-trigger this on every subsequent Firestore write.
                if (!hasInitializedActiveId.current) {
                    hasInitializedActiveId.current = true;
                    if (fetchedDecks.length > 0) {
                        setActiveId(fetchedDecks[0].id);
                        setViewMode('deck');
                    } else if (fetchedFolders.length > 0) {
                        setActiveId(fetchedFolders[0].id);
                        setViewMode('folder');
                    }
                }
            } else {
                // This case is handled on signup, but as a fallback:
                console.log("No user document found, creating one.");
                setDoc(userDocRef, { folders: [], decks: [], profile: { age: '', degree: '' }, subscription: { tier: 'free', credits: 180 } });
            }
        });

        return () => unsubscribe();
    }, [user]);

    const updateFirestore = async (newData) => {
        if (!user) return;
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, newData);
    };

    const activeDeck = viewMode === 'deck' ? decks.find(d => d.id === activeId) : null;
    const activeFolder = viewMode === 'folder' ? folders.find(f => f.id === activeId) : null;

    const updateDeck = (d) => updateFirestore({ decks: decks.map(x => x.id === d.id ? d : x) });
    const updateFolder = (f) => updateFirestore({ folders: folders.map(x => x.id === f.id ? f : x) });
    const updateProfile = (p) => { setUserProfile(p); updateFirestore({ profile: { age: p.age, degree: p.degree }, subscription: p.subscription }); };
    const deleteFolder = (id) => {
        const prevDecks = decks; const prevFolders = folders;
        const newDecks = decks.filter(d => d.folderId !== id);
        const newFolders = folders.filter(f => f.id !== id);
        updateFirestore({ decks: newDecks, folders: newFolders });
        setActiveId(null);
        toast(`Folder deleted`, 'info', () => { updateFirestore({ decks: prevDecks, folders: prevFolders }); setActiveId(id); });
    };
    const addDeck = (fid) => {
        const nid = Date.now();
        updateFirestore({ decks: [...decks, { id: nid, folderId: fid, title: 'New Module', mode: 'dashboard' }] });
        setViewMode('deck');
        setActiveId(nid);
    };
    const deleteDeck = (id) => {
        const prevDecks = decks;
        const rem = decks.filter(d => d.id !== id);
        updateFirestore({ decks: rem });
        if(activeId === id) setActiveId(rem[0]?.id || null);
        toast(`Module deleted`, 'info', () => updateFirestore({ decks: prevDecks }));
    };

    const openRenameFolder = (folder) => setNameModal({ isOpen: true, type: 'rename', folder: folder, value: folder.name });
    const handleSaveName = (name) => {
        if (nameModal.type === 'create') {
            updateFirestore({ folders: [...folders, { id: Date.now(), name, syllabus: '', coverage: null }] });
        } else {
            updateFirestore({ folders: folders.map(f => f.id === nameModal.folder.id ? { ...f, name } : f) });
        }
        setNameModal({ isOpen: false, type: '', folder: null, value: '' });
    };

    const openAddFolder = () => setNameModal({ isOpen: true, type: 'create', folder: null, value: '' });

    // NEW: Hardcoded upgrade logic
    const handleUpgrade = async (code) => {
        if (code !== "grum#kong") {
            alert("Invalid upgrade code. Please check the code and try again.");
            return;
        }

        setShowUpgradeModal(false);
        const newSubscription = {
            tier: 'pro',
            credits: 3000, // Boosted credits
            subscriptionId: 'grum#kong', // The requested unique ID
            lastUpdated: serverTimestamp()
        };
        await updateFirestore({ subscription: newSubscription });
        alert("Upgrade successful! Welcome to KonDeck Pro. Your credits have been boosted to 500/month.");
    };

    const handleLogout = async () => {
        await signOut(auth);
        setShowSettings(false);
    };

    if (loading) {
        return <div className="w-full h-screen flex items-center justify-center"><RotateCw className="animate-spin text-indigo-600" size={48} /></div>;
    }

    if (!user) {
        return <AuthPage onAuthSuccess={(authedUser) => setUser(authedUser)} />;
    }

    return (
        <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-900">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
            <Sidebar
                user={user} folders={folders} decks={decks} activeId={activeId} viewMode={viewMode}
                onSelectDeck={(id) => { setViewMode('deck'); setActiveId(id); if(decks.find(d=>d.id===id)) updateDeck({...decks.find(d=>d.id===id), mode: 'dashboard'}); }}
                onSelectFolder={(id) => { setViewMode('folder'); setActiveId(id); }}
                onAddFolder={openAddFolder} onDeleteFolder={deleteFolder} onRenameFolder={openRenameFolder}
                onAddDeck={addDeck} onDeleteDeck={deleteDeck}
                onSettings={() => setShowSettings(true)}
            />
            <main className="flex-1 overflow-y-auto custom-scroll relative bg-[#f8fafc]">
                {viewMode === 'folder' && activeFolder && <FolderDashboard folder={activeFolder} decks={decks.filter(d => d.folderId === activeFolder.id)} onUpdateFolder={updateFolder} onUpdateDeck={updateDeck} userProfile={userProfile} />}
                {viewMode === 'deck' && activeDeck && (
                    <>
                        {activeDeck.mode === 'dashboard' && <ModuleDashboard deck={activeDeck} onUpdateDeck={updateDeck} userProfile={userProfile} onUpdateProfile={updateProfile} />}
                        {activeDeck.mode === 'flashcards' && <FlashcardStudy cards={activeDeck.cards || []} deck={activeDeck} onUpdateDeck={updateDeck} onBack={() => updateDeck({...activeDeck, mode: 'dashboard'})} />}
                        {/* Using 'quiz' mode for practice, 'exam' mode passes special prop */}
                        {activeDeck.mode === 'quiz' && <ExamRunner questions={activeDeck.quiz || []} deck={activeDeck} onBack={() => updateDeck({...activeDeck, mode: 'dashboard'})} userProfile={userProfile} practice={true} onRecordResult={(r) => updateDeck({...activeDeck, stats: {...(activeDeck.stats||{}), lastStudied: r.date, examHistory: [...((activeDeck.stats?.examHistory||[]).slice(-9)), r]}})} />}
                        {activeDeck.mode === 'exam' && <ExamRunner questions={activeDeck.exams || []} timeLimit={activeDeck.examTimeLimit || 0} deck={activeDeck} onBack={() => updateDeck({...activeDeck, mode: 'dashboard'})} userProfile={userProfile} onRecordResult={(r) => updateDeck({...activeDeck, stats: {...(activeDeck.stats||{}), lastStudied: r.date, examHistory: [...((activeDeck.stats?.examHistory||[]).slice(-9)), r]}})} />}
                        {activeDeck.mode === 'saq' && <SAQMode questions={activeDeck.saqs || []} onBack={() => updateDeck({...activeDeck, mode: 'dashboard'})} userProfile={userProfile} />}
                    </>
                )}

                {!activeDeck && !activeFolder && <div className="flex h-full items-center justify-center text-slate-400"><BookOpen size={48} className="opacity-50"/></div>}
            </main>

            {/* Name Input Modal */}
            <NameModal
                isOpen={nameModal.isOpen}
                type={nameModal.type}
                initialValue={nameModal.value}
                onClose={() => setNameModal({ ...nameModal, isOpen: false })}
                onSave={handleSaveName}
            />

            {showSettings && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex justify-between items-center p-6 border-b"><h3 className="font-bold text-lg">Settings</h3><button onClick={() => setShowSettings(false)}><X /></button></div>
                        <div className="space-y-4 p-6">
                            <div>
                                <h4 className="font-bold mb-2 text-slate-700">Subscription</h4>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="text-sm font-bold text-indigo-600">KonDeck</span>
                                            <p className="text-xs text-slate-500">AI-powered study assistant.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold mb-2 text-slate-700">Profile Settings</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <input placeholder="Age" type="number" value={userProfile.age} onChange={e => setUserProfile({ ...userProfile, age: e.target.value })} className="p-2 border rounded-lg" />                                    <input placeholder="Degree" value={userProfile.degree} onChange={e => setUserProfile({ ...userProfile, degree: e.target.value })} className="p-2 border rounded-lg" />
                                </div>
                                <p className="text-xs text-slate-500 mt-2">These details help the AI generate relevant content.</p>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t rounded-b-xl">
                            <div className="flex flex-col gap-2">
                                <button onClick={() => {
                                    updateProfile(userProfile);
                                    setShowSettings(false);
                                }} className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg">Save Settings</button>
                                <button onClick={handleLogout} className="w-full bg-red-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2">
                                    <LogOut size={16} /> Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AppInner;
