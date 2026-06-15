import React, { useMemo, useState, useEffect } from 'react';
import { sections } from './data';
import { SectionDef, RatingOption, EvaluationRecord } from './types';
import { CheckCircle2, AlertTriangle, ShieldX, Check, Database, Plus, PieChart, ClipboardList, MessageSquare, Activity, User, LogOut } from 'lucide-react';
import DatabaseView from './DatabaseView';
import RecordDetailView from './RecordDetailView';
import AnalyticsView from './AnalyticsView';
import { appendRecordToSpreadsheet } from './sheetsService';
import { auth, db } from './firebase';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously
} from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import { KeyRound, ShieldAlert, Sparkles, X } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'form' | 'db' | 'detail' | 'analytics'>('form');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  
  const [interviewerName, setInterviewerName] = useState('');
  
  // Google Sheets states
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [sheetsConfig, setSheetsConfig] = useState<{
    spreadsheetId: string | null;
    spreadsheetUrl: string | null;
    spreadsheetTitle: string | null;
    syncEnabled: boolean;
  }>(() => {
    const saved = localStorage.getItem('ultatel_sheets_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      spreadsheetId: null,
      spreadsheetUrl: null,
      spreadsheetTitle: null,
      syncEnabled: false
    };
  });

  // Persist sheets config
  useEffect(() => {
    localStorage.setItem('ultatel_sheets_config', JSON.stringify(sheetsConfig));
  }, [sheetsConfig]);

  const onAuthorizeSheets = async (): Promise<string | null> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/spreadsheets');
      provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleToken(credential.accessToken);
        setUser(result.user);
        return credential.accessToken;
      }
      return null;
    } catch (err: any) {
      console.error("Sheets authorization failed:", err);
      if (err.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        const msg = `Unauthorized Domain: The preview domain "${domain}" has not been authorized in Firebase. Please add "${domain}" to authorized domains in Firebase Console (project ID: ${firebaseConfig.projectId}) under Authentication -> Settings -> Authorized domains.`;
        alert(msg);
        throw new Error(msg);
      }
      alert(`Authorization failed: ${err.message || err}`);
      return null;
    }
  };
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [candidateSite, setCandidateSite] = useState('Cairo');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showToast, setShowToast] = useState(false);
  
  const [database, setDatabase] = useState<EvaluationRecord[]>([]);
  const [user, setUser] = useState<any>(() => {
    const localUserStr = localStorage.getItem('ultatel_local_user');
    if (localUserStr) {
      try {
        return JSON.parse(localUserStr);
      } catch (e) {
        localStorage.removeItem('ultatel_local_user');
      }
    }
    // Default to a 150% free Sandbox/Guest account out-of-the-box so users are never gated or blocked by deployment setup
    return {
      uid: 'local-sandbox-admin',
      displayName: 'Guest HR Admin',
      email: 'sandbox@ultatel.com',
      isSandbox: true,
      photoURL: ''
    };
  });
  const [authChecking, setAuthChecking] = useState(true);

  // Custom login state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<React.ReactNode | string>('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // Initialize and check local storage user if present
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Standard firebase user state overrides local mock ONLY if currentUser is present
      if (currentUser) {
        setUser(currentUser);
        localStorage.removeItem('ultatel_local_user'); // Clear local temp session to prioritize real session
      } else {
        const localUserStr = localStorage.getItem('ultatel_local_user');
        if (localUserStr) {
          try {
            setUser(JSON.parse(localUserStr));
          } catch (e) {
            localStorage.removeItem('ultatel_local_user');
          }
        } else {
          setUser({
            uid: 'local-sandbox-admin',
            displayName: 'Guest HR Admin',
            email: 'sandbox@ultatel.com',
            isSandbox: true,
            photoURL: ''
          });
        }
      }
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync database with Firestore or Local Storage Fallback
  useEffect(() => {
    if (!user) {
      setDatabase([]);
      return;
    }

    // Checking if they are simulated guest / local sandbox admin
    if (user.uid === 'local-sandbox-admin' || user.isSandbox) {
      const stored = localStorage.getItem('ultatel_evaluations');
      if (stored) {
        try {
          setDatabase(JSON.parse(stored));
        } catch (e) {
          console.error('Error parsing evaluations', e);
        }
      } else {
        setDatabase([]);
      }
      return;
    }

    // Try standard Firestore snapshot
    const q = query(collection(db, 'evaluations'), where('authorId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: EvaluationRecord[] = [];
      snapshot.forEach(doc => {
        records.push(doc.data() as EvaluationRecord);
      });
      records.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDatabase(records);
      
      // Keep a shadow cache in localStorage in case offline/unauthorized later
      localStorage.setItem(`ultatel_evaluations_${user.uid}`, JSON.stringify(records));
    }, (error: any) => {
      console.warn('Firestore Error, using local backup database:', error);
      // Fallback to local storage evaluations for this user or overall cache
      const stored = localStorage.getItem(`ultatel_evaluations_${user.uid}`) || localStorage.getItem('ultatel_evaluations');
      if (stored) {
        try {
          setDatabase(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Login handler with Google
  const handleGoogleLogin = async () => {
    setLoginError('');
    setIsLoginLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/spreadsheets');
      provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleToken(credential.accessToken);
      }
      setShowLoginModal(false);
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/popup-closed-by-user') {
        setLoginError("Sign-in cancelled. Popup closed.");
      } else if (e.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        setLoginError(
          <div className="space-y-2 text-left text-red-700 bg-red-50 p-3 rounded-xl border border-red-100">
            <p className="font-extrabold text-xs flex items-center gap-1.5 text-red-800 uppercase tracking-wide">
              <ShieldAlert className="w-4.5 h-4.5 shrink-0 text-red-500" />
              Firebase Domain Blocked
            </p>
            <p className="text-[11px] font-medium text-slate-600 leading-normal">
              Firebase Auth blocks Google login from this preview URL. To resolve:
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600 font-semibold leading-normal">
              <li>Open your <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-brand-blue underline hover:text-brand-blue-light font-extrabold">Firebase Console</a></li>
              <li>Select your project <strong>{firebaseConfig.projectId}</strong></li>
              <li>Navigate to <strong>Authentication &gt; Settings &gt; Authorized domains</strong></li>
              <li>Click <strong>Add domain</strong> and copy-paste:</li>
            </ol>
            <div className="bg-white p-2 rounded border border-red-100 select-all font-mono text-[10px] text-red-700 break-all font-black text-center">
              {domain}
            </div>
            <p className="text-[10.5px] text-slate-500 font-semibold leading-normal pt-1 italic">
              💡 Or continue immediately by using <strong>Email &amp; Password</strong> below, or click <strong>Launch Guest Sandbox</strong>!
            </p>
          </div>
        );
      } else if (e.code === 'auth/operation-not-allowed') {
        setLoginError(
          <div className="space-y-2 text-left text-red-700 bg-red-50 p-3 rounded-xl border border-red-100">
            <p className="font-extrabold text-xs flex items-center gap-1.5 text-red-800 uppercase tracking-wide">
              <ShieldAlert className="w-4.5 h-4.5 shrink-0 text-red-500" />
              Provider Disabled in Firebase
            </p>
            <p className="text-[11px] font-medium text-slate-600 leading-normal">
              The <strong>Google</strong> sign-in method is not enabled in your Firebase project. To enable it:
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600 font-semibold leading-normal">
              <li>Open your <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-brand-blue underline hover:text-brand-blue-light font-extrabold">Firebase Console</a></li>
              <li>Select project <strong>{firebaseConfig.projectId}</strong></li>
              <li>Go to <strong>Authentication &gt; Sign-in method</strong></li>
              <li>Click <strong>Add new provider</strong>, select <strong>Google</strong>, and toggle <strong>Enable</strong>!</li>
            </ol>
            <p className="text-[10.5px] text-slate-500 font-semibold leading-normal pt-1 italic">
              💡 Or continue immediately by clicking <strong>Launch Live Demo Sandbox</strong> below!
            </p>
          </div>
        );
      } else {
        setLoginError(`Google Sign-In failed: ${e.message}`);
      }
    } finally {
      setIsLoginLoading(false);
    }
  };

  // Helper for rendering Email Provider disable explanation
  const renderEmailProviderWarning = () => {
    setLoginError(
      <div className="space-y-2 text-left text-red-700 bg-red-50 p-3 rounded-xl border border-red-100">
        <p className="font-extrabold text-xs flex items-center gap-1.5 text-red-800 uppercase tracking-wide">
          <ShieldAlert className="w-4.5 h-4.5 shrink-0 text-red-500" />
          Email Sign-In Disabled
        </p>
        <p className="text-[11px] font-medium text-slate-600 leading-normal">
          The <strong>Email/Password</strong> sign-in method is not enabled in your Firebase project. To enable it:
        </p>
        <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600 font-semibold leading-normal">
          <li>Open your <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-brand-blue underline hover:text-brand-blue-light font-extrabold">Firebase Console</a></li>
          <li>Select project <strong>{firebaseConfig.projectId}</strong></li>
          <li>Go to <strong>Authentication &gt; Sign-in method</strong></li>
          <li>Click <strong>Add new provider</strong>, select <strong>Email/Password</strong>, and toggle <strong>Enable</strong>!</li>
        </ol>
        <p className="text-[10.5px] text-slate-500 font-semibold leading-normal pt-1 italic">
          💡 Or continue immediately by clicking <strong>Launch Live Demo Sandbox</strong> below!
        </p>
      </div>
    );
  };

  // Sign In or Auto Sign Up with Email/Password
  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError("Please fill in both email and password.");
      return;
    }
    setLoginError('');
    setIsLoginLoading(true);
    
    try {
      // First try to sign in
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setShowLoginModal(false);
    } catch (signInErr: any) {
      if (signInErr.code === 'auth/operation-not-allowed') {
        renderEmailProviderWarning();
      } else if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
          setShowLoginModal(false);
        } catch (signUpErr: any) {
          if (signUpErr.code === 'auth/operation-not-allowed') {
            renderEmailProviderWarning();
          } else {
            setLoginError(`Authentication failed: ${signUpErr.message}`);
          }
        }
      } else {
        setLoginError(`Authentication failed: ${signInErr.message}`);
      }
    } finally {
      setIsLoginLoading(false);
    }
  };

  // Fast bypass custom Local Sandbox / Guest Login
  const handleGuestSandboxLogin = async () => {
    setLoginError('');
    setIsLoginLoading(true);
    try {
      // Attempt anonymous login with Firebase first (retains full Firestore connectivity)
      try {
        await signInAnonymously(auth);
        setShowLoginModal(false);
        return;
      } catch (anonErr) {
        console.warn("Firebase Anonymous Sign-In is not enabled on this console. Falling back to secure off-database Sandbox Admin...");
      }

      // Offline client-side Sandbox Account
      const mockUser = {
        uid: 'local-sandbox-admin',
        displayName: 'Guest HR Admin',
        email: 'sandbox@ultatel.com',
        isSandbox: true,
        photoURL: ''
      };
      localStorage.setItem('ultatel_local_user', JSON.stringify(mockUser));
      setUser(mockUser);
      setShowLoginModal(false);
    } catch (err: any) {
      setLoginError(`Sandbox activation failed: ${err.message}`);
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    localStorage.removeItem('ultatel_local_user');
    setUser({
      uid: 'local-sandbox-admin',
      displayName: 'Guest HR Admin',
      email: 'sandbox@ultatel.com',
      isSandbox: true,
      photoURL: ''
    });
  };

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    if (!candidateName || !interviewerName) {
       return alert("Please provide at least Interviewer Name and Candidate Name");
    }

    const newRecordId = Math.random().toString(36).substr(2, 9);
    const newRecord: any = {
      id: newRecordId,
      date: new Date().toISOString(),
      interviewerName,
      candidateName,
      candidateSite,
      answers,
      scoreInfo,
      authorId: user.uid
    };
    if (candidateEmail) newRecord.candidateEmail = candidateEmail;
    if (candidatePhone) newRecord.candidatePhone = candidatePhone;
    
    // Save locally first to guarantee zero-data-loss for sandbox/offline
    const stored = localStorage.getItem('ultatel_evaluations');
    let localDB: any[] = [];
    if (stored) {
      try {
        localDB = JSON.parse(stored);
      } catch (e) {}
    }
    localDB.unshift(newRecord);
    localStorage.setItem('ultatel_evaluations', JSON.stringify(localDB));
    localStorage.setItem(`ultatel_evaluations_${user.uid}`, JSON.stringify(localDB));

    // Google Sheets real-time synchronization
    if (sheetsConfig.syncEnabled && sheetsConfig.spreadsheetId) {
      if (googleToken) {
        appendRecordToSpreadsheet(googleToken, sheetsConfig.spreadsheetId, newRecord)
          .then(() => console.log("Successfully synchronized record to connected Google Sheet real-time"))
          .catch((err) => console.error("Real-time Sheets synchronization failed:", err));
      } else {
        console.warn("Real-time Sheets sync is active, but Google auth token has expired or is missing.");
      }
    }

    if (user.uid === 'local-sandbox-admin' || user.isSandbox) {
      setDatabase(localDB);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        setCandidateName('');
        setCandidateEmail('');
        setCandidatePhone('');
        setCandidateSite('Cairo');
        setAnswers({});
        setCurrentView('db');
      }, 1500);
      return;
    }
    
    try {
      await setDoc(doc(db, 'evaluations', newRecordId), newRecord);
      setShowToast(true);
      
      setTimeout(() => {
        setShowToast(false);
        setCandidateName('');
        setCandidateEmail('');
        setCandidatePhone('');
        setCandidateSite('Cairo');
        setAnswers({});
        setCurrentView('db');
      }, 1500);
    } catch (e: any) {
      console.warn("Error writing to Firestore, falling back to local database:", e);
      alert(`Report saved to local database fallback (${e.message || 'Firestore offline'}). You can fully access it on this browser!`);
      setDatabase(localDB);
      setCurrentView('db');
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (confirm('Are you sure you want to delete this evaluation?')) {
      // Delete locally
      const stored = localStorage.getItem('ultatel_evaluations');
      let localDB: any[] = [];
      if (stored) {
        try {
          localDB = JSON.parse(stored);
        } catch (e) {}
      }
      localDB = localDB.filter(r => r.id !== id);
      localStorage.setItem('ultatel_evaluations', JSON.stringify(localDB));
      if (user) {
        localStorage.setItem(`ultatel_evaluations_${user.uid}`, JSON.stringify(localDB));
      }

      if (user?.uid === 'local-sandbox-admin' || user?.isSandbox) {
        setDatabase(localDB);
        if (selectedRecordId === id) setSelectedRecordId(null);
        return;
      }

      try {
        await deleteDoc(doc(db, 'evaluations', id));
        if (selectedRecordId === id) setSelectedRecordId(null);
      } catch (e) {
        console.warn("Deleted locally, firestore delete failed (mock mode or permission issue):", e);
        setDatabase(localDB);
        if (selectedRecordId === id) setSelectedRecordId(null);
      }
    }
  };

  const handleViewRecord = (id: string) => {
    setSelectedRecordId(id);
    setCurrentView('detail');
  };

  const selectedRecord = useMemo(() => {
    return database.find(r => r.id === selectedRecordId);
  }, [selectedRecordId, database]);

  // Calculate scores
  const scoreInfo = useMemo(() => {
    let total = 0;
    let sec3 = 0; // Mindset (30)
    let sec4 = 0; // Honesty (20)
    let sec6 = 0; // Coachability (15)
    let sec7 = 0; // Communication (15)

    const addScore = (qId: string, sectionId: string) => {
      const val = answers[qId] as number;
      if (val) {
        total += val;
        if (sectionId === 'sec3') sec3 += val;
        if (sectionId === 'sec4') sec4 += val;
        if (sectionId === 'sec6') sec6 += val;
        if (sectionId === 'sec7') sec7 += val;
      }
    };

    sections.forEach(sec => {
      sec.questions.forEach(q => {
        if (q.type === 'rating') {
          addScore(q.id, sec.id);
        }
      });
    });

    let rec = "Do not hire";
    let color = "text-red-600 bg-red-50";
    if (total >= 85) { rec = "Strong hire"; color = "text-green-700 bg-green-50 rounded-xl px-2 py-1"; }
    else if (total >= 78) { rec = "Hire"; color = "text-emerald-600 bg-emerald-50 rounded-xl px-2 py-1"; }
    else if (total >= 70) { rec = "Possible hire, only if mindset and honesty are strong"; color = "text-amber-600 bg-amber-50 rounded-xl px-2 py-1"; }
    else if (total >= 60) { rec = "High risk"; color = "text-orange-600 bg-orange-50 rounded-xl px-2 py-1"; }
    else { rec = "Do not hire"; color = "text-red-600 bg-red-50 rounded-xl px-2 py-1"; }

    const isMindsetFail = sec3 && sec3 < 22; // Must be 22/30+
    const isHonestyFail = sec4 && sec4 < 15; // Must be 15/20+
    
    // Automatic Red flags checking
    const q32Val = answers['q32']; // Do they seem honest when performance is weak?
    const q34Val = answers['q34']; // Do they accept correction without ego?
    const q37Val = answers['q37']; // Do I believe they will still be here?

    const autoFails = [];
    if (q32Val === 'No') autoFails.push("Candidate does not seem honest when performance is weak.");
    if (q34Val === 'No') autoFails.push("Candidate does not accept correction without ego.");
    if (q37Val === 'No') autoFails.push("Do not believe candidate will stay after training gets difficult.");

    return { total, sec3, sec4, sec6, sec7, rec, color, isMindsetFail, isHonestyFail, autoFails };
  }, [answers]);

  return (
    <div className="flex h-screen bg-brand-light text-slate-900 font-sans overflow-hidden">
      
      {/* Sidebar Navigation (Desktop) */}
      <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col hidden md:flex z-10 shadow-sm relative">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
           <svg width="28" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
             <path d="M20 2L35.5885 11V29L20 38L4.41154 29V11L20 2Z" stroke="var(--color-brand-blue)" strokeWidth="4" strokeLinejoin="round"/>
             <path d="M12 16V27L20 31.5V16" stroke="var(--color-brand-blue-light)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
             <path d="M28 16V22L20 26.5" stroke="var(--color-brand-blue-light)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
           </svg>
           <span className="text-brand-blue font-black tracking-widest text-lg" style={{ letterSpacing: '0.1em' }}>ULTATEL</span>
        </div>
        
        <div className="p-4">
           <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">HR Management</h2>
           <nav className="space-y-1.5">
             <button 
               onClick={() => setCurrentView('form')} 
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                 currentView === 'form' 
                   ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20' 
                   : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
               }`}
             >
               <ClipboardList className="w-5 h-5 shrink-0" />
               New Evaluation
             </button>
             
             <button 
               onClick={() => setCurrentView('db')} 
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                 currentView === 'db' || currentView === 'detail'
                   ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20' 
                   : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
               }`}
             >
               <Database className="w-5 h-5 shrink-0" />
               Candidate Database
             </button>
             
             <button 
               onClick={() => setCurrentView('analytics')} 
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                 currentView === 'analytics' 
                   ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20' 
                   : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
               }`}
             >
               <PieChart className="w-5 h-5 shrink-0" />
               Analytics & Insights
             </button>
           </nav>
        </div>

        <div className="mt-auto p-4 border-t border-slate-100 flex flex-col gap-3">
          {user ? (
            <>
              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${user.isSandbox ? 'bg-amber-100/60 border border-amber-200' : 'bg-brand-light'}`}>
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-full h-full rounded-full" />
                    ) : (
                      <User className={`w-4 h-4 ${user.isSandbox ? 'text-amber-600 font-bold' : 'text-brand-blue'}`} />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-black text-slate-900 truncate">{user.displayName || 'Guest HR Admin'}</div>
                    <div className="text-[10px] text-slate-500 font-semibold truncate">
                      {user.isSandbox ? 'Sandbox Mode' : (user.email || 'hr@ultatel.com')}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center shrink-0">
                  {user.isSandbox ? (
                    <span className="flex h-2 w-2 relative" title="Sandbox Offline Active">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  ) : (
                    <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Logout to Sandbox">
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {user.isSandbox ? (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="w-full py-1.5 px-3 bg-brand-blue text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-brand-blue-light transition-all text-center shrink-0 flex items-center justify-center gap-1.5 animate-pulse"
                >
                  <Database className="w-3.5 h-3.5" />
                  Connect Firebase Cloud
                </button>
              ) : (
                <div className="flex items-center gap-1.5 justify-center py-1 bg-emerald-50 text-emerald-800 rounded-lg text-[10px] font-black uppercase tracking-widest px-2 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Cloud Sync Active
                </div>
              )}
            </>
          ) : (
            <button onClick={() => setShowLoginModal(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm font-bold rounded-lg shadow-sm hover:bg-brand-blue-light transition-all">
               <User className="w-4 h-4" />
               Log In as Admin
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between bg-white p-4 border-b border-slate-200 shrink-0">
           <div className="flex items-center gap-2">
             <svg width="24" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
               <path d="M20 2L35.5885 11V29L20 38L4.41154 29V11L20 2Z" stroke="var(--color-brand-blue)" strokeWidth="4" strokeLinejoin="round"/>
               <path d="M12 16V27L20 31.5V16" stroke="var(--color-brand-blue-light)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
               <path d="M28 16V22L20 26.5" stroke="var(--color-brand-blue-light)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
             </svg>
             <span className="text-brand-blue font-black tracking-widest text-base" style={{ letterSpacing: '0.1em' }}>ULTATEL</span>
           </div>
           
           <div className="flex items-center gap-1">
              {!user ? (
                <button onClick={() => setShowLoginModal(true)} className="text-[10px] font-black text-brand-blue bg-brand-light px-2.5 py-1.5 rounded mr-2 uppercase tracking-wide">Connect Cloud</button>
              ) : (
                <button onClick={handleLogout} className="text-xs font-bold text-slate-500 hover:text-red-500 uppercase tracking-wide mr-2"><LogOut className="w-4 h-4"/></button>
              )}
              <button onClick={() => setCurrentView('form')} className={`p-2 rounded ${currentView === 'form' ? 'text-brand-blue bg-brand-light' : 'text-slate-500'}`}><ClipboardList className="w-5 h-5"/></button>
              <button onClick={() => setCurrentView('db')} className={`p-2 rounded ${currentView === 'db' || currentView === 'detail' ? 'text-brand-blue bg-brand-light' : 'text-slate-500'}`}><Database className="w-5 h-5"/></button>
              <button onClick={() => setCurrentView('analytics')} className={`p-2 rounded ${currentView === 'analytics' ? 'text-brand-blue bg-brand-light' : 'text-slate-500'}`}><PieChart className="w-5 h-5"/></button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {currentView === 'db' && (
              <DatabaseView 
                data={database} 
                onDelete={handleDeleteRecord} 
                onView={handleViewRecord}
                sheetsConfig={sheetsConfig}
                setSheetsConfig={setSheetsConfig}
                googleToken={googleToken}
                onAuthorizeSheets={onAuthorizeSheets}
              />
            )}

            {currentView === 'analytics' && (
              <AnalyticsView data={database} />
            )}

            {currentView === 'detail' && selectedRecord && (
              <RecordDetailView record={selectedRecord} onBack={() => setCurrentView('db')} />
            )}

            {currentView === 'form' && (
              <div className="flex flex-col xl:flex-row gap-8 relative items-start">
                
                {/* Main Form Area */}
                <div className="flex-1 space-y-8 min-w-0 w-full">
                  <header className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">BDR Interview Guide</h1>
                    <p className="mt-2 text-sm text-slate-500 font-medium">Business Development Representative Scorecard</p>
                    
                    <div className="mt-8 border-b border-slate-100 pb-6 mb-6">
                       <label className="block text-xs font-bold tracking-widest text-slate-500 mb-2 uppercase">Interviewer Name</label>
                       <input 
                          type="text" 
                          className="w-full sm:w-1/2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:outline-none transition-all text-sm font-medium" 
                          value={interviewerName}
                          onChange={(e) => setInterviewerName(e.target.value)}
                          placeholder="E.g. Jordan Davis"
                       />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div>
                        <label className="block text-xs font-bold tracking-widest text-slate-500 mb-2 uppercase">Candidate Name</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:outline-none transition-all text-sm font-medium" 
                          value={candidateName}
                          onChange={(e) => setCandidateName(e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold tracking-widest text-slate-500 mb-2 uppercase">Site</label>
                        <select
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:outline-none transition-all text-sm font-medium"
                          value={candidateSite}
                          onChange={(e) => setCandidateSite(e.target.value)}
                        >
                          <option value="Cairo">Cairo</option>
                          <option value="Alex">Alexandria</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold tracking-widest text-slate-500 mb-2 uppercase">Email Address</label>
                        <input 
                          type="email" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:outline-none transition-all text-sm font-medium" 
                          value={candidateEmail}
                          onChange={(e) => setCandidateEmail(e.target.value)}
                          placeholder="john@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold tracking-widest text-slate-500 mb-2 uppercase">Phone Number</label>
                        <input 
                          type="tel" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:outline-none transition-all text-sm font-medium" 
                          value={candidatePhone}
                          onChange={(e) => setCandidatePhone(e.target.value)}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                  </header>

                  {sections.map((section: SectionDef) => (
                    <div key={section.id} className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200">
                      <div className="border-b border-slate-100 pb-4 mb-6 relative">
                        {section.weight && (
                          <div className="absolute right-0 top-0 mt-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-black uppercase tracking-wider">
                            {section.weight} Pts Total
                          </div>
                        )}
                        <h2 className="text-xl font-black text-slate-900 pr-24">{section.title}</h2>
                        {section.description && (
                          <div className="mt-4 bg-brand-light/50 border-l-4 border-brand-blue p-4 rounded-r-lg">
                            <p className="text-sm text-brand-blue font-semibold leading-relaxed whitespace-pre-wrap">{section.description}</p>
                          </div>
                        )}
                      </div>

                      {section.roleplayScript && (
                        <div className="mb-8 p-6 bg-slate-50 rounded-lg border border-slate-200">
                          <h3 className="text-sm font-black tracking-widest uppercase text-slate-600 mb-4 flrx items-center gap-2">
                             <MessageSquare className="w-4 h-4 inline-block mr-2 text-brand-yellow"/>
                             Roleplay Script:
                          </h3>
                          <div className="space-y-4">
                            {section.roleplayScript.map((line, idx) => (
                              <p key={idx} className="text-sm text-slate-700 font-medium leading-relaxed">
                                {line}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-8">
                        {section.questions.map((q) => (
                          <div key={q.id} className="space-y-4 group">
                            <div className="flex justify-between items-start">
                              <h3 className="font-bold text-slate-900 text-[15px] flex gap-3 leading-snug">
                                <span className="text-brand-blue-light">{q.id.replace('q', '')}.</span>
                                <span>{q.text}</span>
                              </h3>
                              {q.type === 'rating' && <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 mt-1">Rate</span>}
                            </div>
                            {q.clarification && (
                              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 ml-6 flex gap-2 font-medium">
                                <span className="font-bold text-brand-blue uppercase shrink-0">Hint:</span> 
                                {q.clarification}
                              </p>
                            )}
                            
                            <div className="mt-4 ml-6">
                              {q.type === 'text' && (
                                <textarea 
                                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:outline-none min-h-[120px] transition-all text-sm font-medium"
                                  placeholder="Enter response here..."
                                  value={answers[q.id] || ''}
                                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                                />
                              )}

                              {q.type === 'choice' && (
                                <div className="space-y-2">
                                  {(q.options as string[]).map((opt) => (
                                    <label key={opt} className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all
                                      ${answers[q.id] === opt ? 'bg-brand-light/20 border-brand-blue shadow-sm ring-1 ring-brand-blue' : 'bg-white border-slate-200 hover:border-slate-300'}
                                    `}>
                                      <input 
                                        type="radio" 
                                        className="sr-only"
                                        name={q.id}
                                        value={opt}
                                        checked={answers[q.id] === opt}
                                        onChange={() => handleAnswer(q.id, opt)}
                                      />
                                      <div className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center mr-4
                                        ${answers[q.id] === opt ? 'border-brand-blue bg-brand-blue' : 'border-slate-300'}`}>
                                        {answers[q.id] === opt && <Check className="w-3 h-3 text-white" />}
                                      </div>
                                      <span className={`text-sm ${answers[q.id] === opt ? 'text-brand-blue font-bold' : 'text-slate-700 font-semibold'}`}>{opt}</span>
                                    </label>
                                  ))}
                                </div>
                              )}

                              {q.type === 'yes_no' && (
                                <div className="flex flex-wrap gap-3">
                                  {['Yes', 'No', 'Maybe'].map((opt) => (
                                    <button
                                      key={opt}
                                      onClick={() => handleAnswer(q.id, opt)}
                                      className={`px-8 py-3 rounded-lg text-sm font-bold border transition-all ${
                                        answers[q.id] === opt 
                                          ? opt === 'No' && ['q32','q34','q37'].includes(q.id) ? 'bg-red-500 border-red-500 text-white shadow-md ring-2 ring-red-500/20' : 'bg-brand-blue border-brand-blue text-white shadow-md ring-2 ring-brand-blue/20'
                                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {q.type === 'rating' && (
                                <div className="grid grid-cols-1 gap-3">
                                  {(q.options as RatingOption[]).map((opt) => (
                                    <button
                                      key={opt.points}
                                      onClick={() => handleAnswer(q.id, opt.points)}
                                      className={`w-full text-left p-4 rounded-lg border transition-all flex items-start gap-4 ${
                                        answers[q.id] === opt.points
                                          ? 'bg-brand-light/30 border-brand-blue shadow-sm ring-1 ring-brand-blue'
                                          : 'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                      }`}
                                    >
                                      <div className={`mt-0.5 w-6 h-6 rounded-full border shrink-0 flex items-center justify-center transition-colors ${
                                        answers[q.id] === opt.points ? 'border-brand-blue bg-brand-blue' : 'border-slate-300 bg-white'
                                      }`}>
                                        {answers[q.id] === opt.points && <Check className="w-3.5 h-3.5 text-white" />}
                                      </div>
                                      <div>
                                        <div className={`text-sm ${answers[q.id] === opt.points ? 'font-black text-brand-blue' : 'font-bold text-slate-700'}`}>
                                          {opt.label} <span className="opacity-60 ml-2 font-semibold">({opt.points} pts)</span>
                                        </div>
                                        <div className={`text-xs mt-1 leading-relaxed ${answers[q.id] === opt.points ? 'text-brand-blue/80 font-medium' : 'text-slate-500 font-medium'}`}>
                                          {opt.text}
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Action Footer */}
                  <div className="py-8 flex justify-end">
                    <button onClick={handleSubmit} className="px-8 py-3.5 bg-brand-yellow text-slate-900 text-sm font-black rounded-lg shadow-md hover:bg-yellow-400 transition-all hover:-translate-y-0.5 uppercase tracking-widest flex items-center gap-2">
                       <CheckCircle2 className="w-5 h-5" />
                       Submit Evaluation
                    </button>
                  </div>
                </div>

                {/* Sticky Scoreboard Sidebar */}
                <div className="w-full xl:w-80 xl:sticky xl:top-8 flex-shrink-0">
                  <div className="bg-white p-6 flex flex-col min-h-[600px] rounded-xl shadow-sm border border-slate-200">
                    <div className="text-center mb-8 pb-8 border-b border-slate-100">
                      <div className="relative inline-block mt-4">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                          <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" strokeLinecap="round" fill="transparent" strokeDasharray="364.4" strokeDashoffset={364.4 - (364.4 * (scoreInfo.total / 100))} className="text-brand-yellow transition-all duration-700" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-black text-slate-900 tracking-tighter">{scoreInfo.total}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</span>
                        </div>
                      </div>
                      <div className="mt-6 flex justify-center">
                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-black rounded-full uppercase tracking-widest shadow-sm ${scoreInfo.color}`}>
                          {scoreInfo.total >= 70 ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                          {scoreInfo.rec}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5 flex-1">
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                         <Activity className="w-4 h-4"/>
                         Critical Thresholds
                      </h4>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-600">Mindset (22/30)</span>
                            <span className={scoreInfo.sec3 >= 22 ? 'text-green-600' : 'text-amber-500'}>{scoreInfo.sec3}/30</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${scoreInfo.sec3 >= 22 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${Math.min((scoreInfo.sec3 / 30) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-600">Honesty (15/20)</span>
                            <span className={scoreInfo.sec4 >= 15 ? 'text-green-600' : 'text-amber-500'}>{scoreInfo.sec4}/20</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${scoreInfo.sec4 >= 15 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${Math.min((scoreInfo.sec4 / 20) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-600">Coachability (11/15)</span>
                            <span className={scoreInfo.sec6 >= 11 ? 'text-green-600' : 'text-amber-500'}>{scoreInfo.sec6}/15</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${scoreInfo.sec6 >= 11 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${Math.min((scoreInfo.sec6 / 15) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-600">Comm/Roleplay (10/15)</span>
                            <span className={scoreInfo.sec7 >= 10 ? 'text-green-600' : 'text-amber-500'}>{scoreInfo.sec7}/15</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${scoreInfo.sec7 >= 10 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${Math.min((scoreInfo.sec7 / 15) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                      </div>

                      {(scoreInfo.isMindsetFail || scoreInfo.autoFails.length > 0) ? (
                        <div className="mt-8 pt-6 border-t border-slate-100">
                          <h4 className="text-[11px] font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <AlertTriangle className="w-4 h-4"/>
                             Automatic Fails
                          </h4>
                          <div className="space-y-3">
                            {scoreInfo.isMindsetFail && (
                              <div className="flex items-center gap-3 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                                <div className="w-2 h-2 shrink-0 rounded-full bg-red-600"></div>
                                <span className="font-bold leading-tight">High Quit Risk (Mindset Failed)</span>
                              </div>
                            )}
                            {scoreInfo.autoFails.map((failMsg, idx) => (
                              <div key={idx} className="flex items-start gap-3 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                                <div className="w-2 h-2 shrink-0 rounded-full bg-red-600 mt-1"></div>
                                <span className="font-bold leading-tight">{failMsg}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-8 pt-6 border-t border-slate-100">
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <ShieldX className="w-4 h-4"/> Red Flags
                          </h4>
                          <div className="flex justify-center items-center h-20 text-xs text-slate-400 p-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
                            <span className="font-semibold text-slate-500">No critical issues detected.</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={handleSubmit} 
                      className="w-full py-4 bg-brand-yellow text-slate-900 font-black rounded-lg mt-8 hover:bg-yellow-400 transition-all uppercase tracking-widest text-[11px] shadow-sm hover:shadow-md hover:-translate-y-0.5 duration-200 flex justify-center items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Complete Evaluation
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Success Toast */}
        {showToast && (
          <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-in fade-in slide-in-from-bottom-8">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
               <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide">Evaluation Submitted</div>
              <div className="text-xs text-slate-400 mt-0.5 font-medium">The evaluation for {candidateName || 'the candidate'} has been saved successfully.</div>
            </div>
          </div>
        )}

        {/* Custom Multi-Method Login Modal Overlay */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden p-6 relative animate-in zoom-in-95 duration-150">
              <button 
                onClick={() => setShowLoginModal(false)}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-brand-light rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-6 h-6 text-brand-blue" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Database Administration</h3>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Select your login method to sync evaluation data</p>
              </div>

              {loginError && (
                <div className="mb-4 bg-red-50 border border-red-100 p-3.5 rounded-xl flex gap-3 text-xs text-red-600 font-bold leading-relaxed shadow-sm">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{loginError}</div>
                </div>
              )}

              <div className="space-y-4">
                {/* 1. Primary Google Auth Option */}
                <button
                  type="button"
                  disabled={isLoginLoading}
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-brand-blue text-white rounded-xl text-sm font-black tracking-wide hover:bg-brand-blue-light transition-all shadow-md shadow-brand-blue/10 disabled:opacity-50 active:scale-[0.98]"
                >
                  {isLoginLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                  ) : (
                    <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C18.155 1.114 15.433 0 12.24 0 5.584 0 0 5.37 0 12s5.584 12 12.24 12c6.96 0 11.57-4.814 11.57-11.79 0-.79-.085-1.39-.188-1.925H12.24z"/>
                    </svg>
                  )}
                  Log In with Google
                </button>

                <div className="flex items-center gap-3 text-slate-300 text-xs font-black uppercase my-4">
                  <div className="h-[1px] bg-slate-100 flex-1"></div>
                  <span>or</span>
                  <div className="h-[1px] bg-slate-100 flex-1"></div>
                </div>

                {/* 2. Email / Password form */}
                <form onSubmit={handleEmailPasswordLogin} className="space-y-3 text-left">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="hr@company.com"
                      value={loginEmail}
                      disabled={isLoginLoading}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:outline-none font-medium transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      disabled={isLoginLoading}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:outline-none font-medium transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoginLoading}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wide hover:bg-slate-800 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                  >
                    {isLoginLoading ? "Processing..." : "Sign In or Auto Sign Up"}
                  </button>
                </form>

                <div className="flex items-center gap-3 text-slate-300 text-xs font-black uppercase my-4 font-sans">
                  <div className="h-[1px] bg-slate-100 flex-1"></div>
                  <span>Vercel Deploy Option</span>
                  <div className="h-[1px] bg-slate-100 flex-1"></div>
                </div>

                {/* 3. Fast Bypass Instant Sandbox/Guest Option */}
                <button
                  type="button"
                  disabled={isLoginLoading}
                  onClick={handleGuestSandboxLogin}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-brand-yellow/10 border border-brand-yellow/30 text-yellow-800 rounded-xl text-xs font-extrabold tracking-wide hover:bg-brand-yellow/20 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-brand-yellow animate-pulse" />
                  Launch Live Demo Sandbox (No Setup)
                </button>
                
                <p className="text-[10px] text-center text-slate-400 font-semibold leading-relaxed px-2">
                  ℹ️ **Sandbox Mode** works out-of-the-box on Vercel & saves evaluations safely using local web storage cache!
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
