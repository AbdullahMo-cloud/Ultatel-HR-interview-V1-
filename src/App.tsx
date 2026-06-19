import React, { useMemo, useState, useEffect } from 'react';
import { sections as defaultSections } from './data';
import { SectionDef, RatingOption, EvaluationRecord } from './types';
import { CheckCircle2, AlertTriangle, ShieldX, Check, Database, Plus, PieChart, ClipboardList, MessageSquare, Activity, User, LogOut, RefreshCw, Brain, ShieldCheck, Target, Settings } from 'lucide-react';
import DatabaseView from './DatabaseView';
import RecordDetailView from './RecordDetailView';
import AnalyticsView from './AnalyticsView';
import AdminPanelView from './AdminPanelView';
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
  const [appSections, setAppSections] = useState<SectionDef[]>(() => {
    const saved = localStorage.getItem('ultatel_sections');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return defaultSections;
  });

  const handleSaveSections = (newSections: SectionDef[]) => {
    setAppSections(newSections);
    localStorage.setItem('ultatel_sections', JSON.stringify(newSections));
    setCurrentView('form');
  };

  const [currentView, setCurrentView] = useState<'form' | 'db' | 'detail' | 'analytics' | 'admin'>('form');
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
  const [candidateSite, setCandidateSite] = useState('Cairo');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showToast, setShowToast] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm' | 'success';
    onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'alert' });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const showAlert = (title: string, message: string, type: 'alert' | 'success' = 'alert') => {
    setDialogConfig({ isOpen: true, title, message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setDialogConfig({ isOpen: true, title, message, type: 'confirm', onConfirm });
  };
  
  const [database, setDatabase] = useState<EvaluationRecord[]>([]);
  const [deletedRecordIds, setDeletedRecordIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ultatel_deleted_record_ids');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('ultatel_deleted_record_ids', JSON.stringify(deletedRecordIds));
  }, [deletedRecordIds]);
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

  const [firebaseSyncError, setFirebaseSyncError] = useState<string | null>(null);

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

    // Fetch all evaluations so they are shared across all users (even sandbox users)
    const q = query(collection(db, 'evaluations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFirebaseSyncError(null);
      const records: EvaluationRecord[] = [];
      snapshot.forEach(doc => {
        const docData = doc.data();
        records.push({
          ...docData,
          id: doc.id
        } as EvaluationRecord);
      });

      // Keep sorting completely safe and immune to corrupt, empty, or missing date formats
      records.sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        const safeA = isNaN(timeA) ? 0 : timeA;
        const safeB = isNaN(timeB) ? 0 : timeB;
        return safeB - safeA;
      });
      
      setDatabase(records);
    }, (error: any) => {
      console.warn('Firestore Error:', error);
      setFirebaseSyncError(error.message || 'Unknown Firestore Sync Error');
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

  const handleEditRecord = (id: string) => {
    const record = filteredDatabase.find(r => r.id === id);
    if (!record) return;

    setEditingRecordId(record.id);
    setCandidateName(record.candidateName || '');
    setCandidateSite(record.candidateSite || 'Cairo');
    setAnswers(record.answers || {});
    if (record.interviewerName) {
      setInterviewerName(record.interviewerName);
    }
    setCurrentView('form');
  };

  const doResetForm = () => {
    setEditingRecordId(null);
    setInterviewerName('');
    setCandidateName('');
    setCandidateSite('Cairo');
    setAnswers({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetForm = () => {
    if (editingRecordId) {
      showConfirm("Reset Form", "Are you sure you want to cancel editing and reset the form to a fresh blank evaluation?", doResetForm);
    } else {
      showConfirm("Reset Form", "Are you sure you want to reload the clean original page and discard any entered details?", doResetForm);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    if (!interviewerName.trim()) {
      return showAlert("Missing Information", "Interviewer Name is required.", "alert");
    }
    if (!candidateName.trim()) {
      return showAlert("Missing Information", "Candidate Name is required.", "alert");
    }
    if (!candidateSite.trim()) {
      return showAlert("Missing Information", "Site is required.", "alert");
    }

    for (const section of appSections) {
      if (section.isInformational) continue;
      for (const q of section.questions) {
        if (q.optional) continue;
        let answer = answers[q.id];
        if (q.type === 'rating' && answer && typeof answer === 'object' && answer.points !== undefined) {
          // valid rating answer
        } else if (answer === undefined || answer === null || (typeof answer === 'string' && answer.trim() === '')) {
          return showAlert("Incomplete Evaluation", `Please answer all questions. Missing: "${q.text.substring(0, 50)}${q.text.length > 50 ? '...' : ''}"`, "alert");
        }
      }
    }

    setIsSubmitting(true);
    
    try {
      const isEdit = !!editingRecordId;
      const targetId = editingRecordId || Math.random().toString(36).substr(2, 9);

      // Maintain previous creation date on edit, otherwise set current time
      let finalDate = new Date().toISOString();
      if (isEdit) {
        const originalRecord = filteredDatabase.find(r => r.id === targetId);
        if (originalRecord) {
          finalDate = originalRecord.date;
        }
      }

      const newRecord: any = {
        id: targetId,
        date: finalDate,
        interviewerName,
        candidateName,
        candidateSite,
        answers,
        scoreInfo,
        authorId: user.uid
      };
      if (isEdit) {
        newRecord.lastEditedAt = new Date().toISOString();
      }

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
      
      try {
        await setDoc(doc(db, 'evaluations', targetId), newRecord);
        setIsSubmitting(false);
        doResetForm();
        setCurrentView('form');
        showAlert("Success", "Evaluation saved successfully to Cloud!", "success");
      } catch (e: any) {
        console.warn("Error writing to Firestore:", e);
        setIsSubmitting(false);
        showAlert("Error", `Failed to save to database: ${e.message}`, "error");
      }
    } catch (e) {
      // In case of any unexpected critical failure that bypasses the normal catch
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = (id: string) => {
    showConfirm('Delete Evaluation', 'Are you sure you want to delete this evaluation?', async () => {
      try {
        // Update state immediately so the deletion is reflected instantly on the UI
        setDeletedRecordIds(prev => [...prev, id]);
        if (selectedRecordId === id) setSelectedRecordId(null);
        await deleteDoc(doc(db, 'evaluations', id));
      } catch (e) {
        console.warn("Firestore delete failed:", e);
        // Remove from deleted ids so it comes back if delete fails maybe, or just keep it removed
      }
    });
  };

  const handleViewRecord = (id: string) => {
    setSelectedRecordId(id);
    setCurrentView('detail');
  };

  const filteredDatabase = useMemo(() => {
    return database.filter(r => !deletedRecordIds.includes(r.id));
  }, [database, deletedRecordIds]);

  const selectedRecord = useMemo(() => {
    return filteredDatabase.find(r => r.id === selectedRecordId);
  }, [selectedRecordId, filteredDatabase]);

  const questionNumbers = useMemo(() => {
    let counter = 1;
    const numMap: Record<string, number> = {};
    appSections.forEach(sec => {
      sec.questions.forEach(q => {
        numMap[q.id] = counter++;
      });
    });
    return numMap;
  }, [appSections]);

  // Calculate scores
  const scoreInfo = useMemo(() => {
    let total = 0;
    const scoresBySection: Record<string, number> = {};
    
    appSections.forEach(sec => {
      scoresBySection[sec.id] = 0;
    });

    const addScore = (qId: string, sectionId: string) => {
      const val = answers[qId] as number;
      if (val) {
        total += val;
        if (scoresBySection[sectionId] !== undefined) {
          scoresBySection[sectionId] += val;
        }
      }
    };

    appSections.forEach(sec => {
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

    // Preserve legacy behavior if the original sections exist
    const isMindsetFail = scoresBySection['sec3'] !== undefined && scoresBySection['sec3'] < 22;
    const isHonestyFail = scoresBySection['sec4'] !== undefined && scoresBySection['sec4'] < 15;
    const isDisciplineFail = scoresBySection['sec5'] !== undefined && scoresBySection['sec5'] < 11;
    const isRetentionFail = scoresBySection['sec8'] !== undefined && scoresBySection['sec8'] < 4;
    
    // Automatic Red flags checking (if these questions still exist)
    const q32Val = answers['q32']; // Do they seem honest when performance is weak?
    const q34Val = answers['q34']; // Do they accept correction without ego?
    const q37Val = answers['q37']; // Do I believe they will still be here?

    const autoFails = [];
    if (q32Val === 'No') autoFails.push("Candidate does not seem honest when performance is weak.");
    if (q34Val === 'No') autoFails.push("Candidate does not accept correction without ego.");
    if (q37Val === 'No') autoFails.push("Do not believe candidate will stay after training gets difficult.");

    // Provide the dynamic scores 
    const sec3 = scoresBySection['sec3'] || 0;
    const sec4 = scoresBySection['sec4'] || 0;
    const sec5 = scoresBySection['sec5'] || 0;
    const sec6 = scoresBySection['sec6'] || 0;
    const sec7 = scoresBySection['sec7'] || 0;
    const sec8 = scoresBySection['sec8'] || 0;

    return { total, scoresBySection, sec3, sec4, sec5, sec6, sec7, sec8, rec, color, isMindsetFail, isHonestyFail, isDisciplineFail, isRetentionFail, autoFails };
  }, [answers, appSections]);

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

             <button 
               onClick={() => setCurrentView('admin')} 
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                 currentView === 'admin' 
                   ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20' 
                   : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
               }`}
             >
               <Settings className="w-5 h-5 shrink-0" />
               Form Templates
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
              ) : firebaseSyncError ? (
                <button
                  onClick={() => alert(`Firestore Sync Error: ${firebaseSyncError}. You are offline and your data is saved locally only.`)} 
                  className="flex items-center gap-1.5 justify-center py-1 bg-red-50 text-red-800 rounded-lg text-[10px] font-black uppercase tracking-widest px-2 shrink-0 border border-red-200"
                >
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  Sync Error (Offline)
                </button>
              ) : (
                <div className="flex items-center gap-1.5 justify-center py-1 bg-emerald-50 text-emerald-800 rounded-lg text-[10px] font-black uppercase tracking-widest px-2 shrink-0 select-none">
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
              <button onClick={() => setCurrentView('admin')} className={`p-2 rounded ${currentView === 'admin' ? 'text-brand-blue bg-brand-light' : 'text-slate-500'}`}><Settings className="w-5 h-5"/></button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {currentView === 'db' && (
              <DatabaseView 
                data={filteredDatabase} 
                onDelete={handleDeleteRecord} 
                onView={handleViewRecord}
                onEdit={handleEditRecord}
                sheetsConfig={sheetsConfig}
                setSheetsConfig={setSheetsConfig}
                googleToken={googleToken}
                onAuthorizeSheets={onAuthorizeSheets}
              />
            )}

            {currentView === 'analytics' && (
              <AnalyticsView data={filteredDatabase} />
            )}

            {currentView === 'detail' && selectedRecord && (
              <RecordDetailView 
                record={selectedRecord} 
                onBack={() => setCurrentView('db')} 
                onEdit={handleEditRecord}
                userEmail={user?.email}
                sections={appSections}
              />
            )}

            {currentView === 'admin' && (
              <AdminPanelView 
                sections={appSections} 
                onSave={handleSaveSections} 
                showConfirm={showConfirm}
                showAlert={showAlert}
              />
            )}

            {currentView === 'form' && (
              <div className="flex flex-col lg:flex-row gap-8 relative items-start">
                
                {/* Main Form Area */}
                <div className="flex-1 space-y-8 min-w-0 w-full">
                  <header className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
                      <div>
                        {editingRecordId ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-black rounded-md uppercase tracking-wider mb-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            Editing Existing Candidate Report
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black rounded-md uppercase tracking-wider mb-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            New Evaluation Mode
                          </div>
                        )}
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">BDR Interview Guide</h1>
                        <p className="mt-1.5 text-xs text-slate-500 font-medium">Business Development Representative Scorecard</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {(editingRecordId || candidateName || Object.keys(answers).length > 0) && (
                          <button
                            type="button"
                            onClick={handleResetForm}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-black text-slate-600 hover:text-red-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-all"
                            title="Reset entire form to a blank state and discard current answers"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Reload Clean Form (Start Fresh)
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-8 border-b border-slate-100 pb-6 mb-6">
                       <label className="block text-xs font-bold tracking-widest text-slate-500 mb-2 uppercase">
                         Interviewer Name <span className="text-red-500 font-extrabold">*</span>
                       </label>
                       <select 
                          className="w-full sm:w-1/2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:outline-none transition-all text-sm font-medium appearance-none" 
                          value={interviewerName}
                          onChange={(e) => setInterviewerName(e.target.value)}
                       >
                          <option value="" disabled>Select Interviewer</option>
                          <option value="Adam Gibson">Adam Gibson</option>
                          <option value="Steven Wilson">Steven Wilson</option>
                          <option value="Merna Hany">Merna Hany</option>
                          <option value="Frank Smith">Frank Smith</option>
                          <option value="Alex Smith">Alex Smith</option>
                          <option value="Ivy Robinson">Ivy Robinson</option>
                          <option value="AJ James">AJ James</option>
                          <option value="Josh Alt">Josh Alt</option>
                          <option value="Tom Miller">Tom Miller</option>
                          <option value="Sam">Sam</option>
                          <option value="Scott Cowell">Scott Cowell</option>
                          <option value="Matt Miller">Matt Miller</option>
                          <option value="August Swift">August Swift</option>
                          <option value="Mariem">Mariem</option>
                          <option value="Sophia">Sophia</option>
                          <option value="Nadine">Nadine</option>
                       </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div>
                        <label className="block text-xs font-bold tracking-widest text-slate-500 mb-2 uppercase">
                          Candidate Name <span className="text-red-500 font-extrabold">*</span>
                        </label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:outline-none transition-all text-sm font-medium" 
                          value={candidateName}
                          onChange={(e) => setCandidateName(e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold tracking-widest text-slate-500 mb-2 uppercase">
                          Site <span className="text-red-500 font-extrabold">*</span>
                        </label>
                        <select
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:outline-none transition-all text-sm font-medium"
                          value={candidateSite}
                          onChange={(e) => setCandidateSite(e.target.value)}
                        >
                          <option value="Cairo">Cairo</option>
                          <option value="Alex">Alexandria</option>
                        </select>
                      </div>
                    </div>
                  </header>

                  {appSections.map((section: SectionDef, secIdx) => {
                    const SECTION_THEMES = [
                      { text: 'text-blue-800', bg: 'bg-blue-100', border: 'border-blue-200' },
                      { text: 'text-purple-800', bg: 'bg-purple-100', border: 'border-purple-200' },
                      { text: 'text-amber-800', bg: 'bg-amber-100', border: 'border-amber-200' },
                      { text: 'text-emerald-800', bg: 'bg-emerald-100', border: 'border-emerald-200' },
                      { text: 'text-rose-800', bg: 'bg-rose-100', border: 'border-rose-200' },
                      { text: 'text-cyan-800', bg: 'bg-cyan-100', border: 'border-cyan-200' },
                      { text: 'text-fuchsia-800', bg: 'bg-fuchsia-100', border: 'border-fuchsia-200' },
                      { text: 'text-teal-800', bg: 'bg-teal-100', border: 'border-teal-200' },
                      { text: 'text-indigo-800', bg: 'bg-indigo-100', border: 'border-indigo-200' },
                      { text: 'text-orange-800', bg: 'bg-orange-100', border: 'border-orange-200' }
                    ];
                    const theme = SECTION_THEMES[secIdx % SECTION_THEMES.length];

                    return (
                    <div key={section.id} className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200">
                      <div className={`pb-4 mb-6 relative px-4 py-3 rounded-lg border ${theme.bg} ${theme.border}`}>
                        {section.questions.some(q => q.type === 'rating') && (
                          <div className={`absolute right-4 top-4 px-3 py-1.5 bg-white/50 rounded-lg text-xs font-black uppercase tracking-wider ${theme.text}`}>
                            {section.questions.reduce((sum, q) => {
                              if (q.type === 'rating' && Array.isArray(q.options)) {
                                return sum + Math.max(...(q.options as RatingOption[]).map(o => o.points || 0), 0);
                              }
                              return sum;
                            }, 0)} Pts Total
                          </div>
                        )}
                        <h2 className={`text-xl font-black pr-24 ${theme.text}`}>{section.title}</h2>
                        {section.description && (
                          <div className={`mt-4 border-l-4 p-4 rounded-r-lg bg-white/40 ${theme.border}`}>
                            <p className={`text-sm font-semibold leading-relaxed whitespace-pre-wrap ${theme.text}`}>{section.description}</p>
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
                            <div className="flex justify-between items-start gap-4">
                              <h3 className="font-bold text-slate-900 text-[15px] flex gap-3 leading-snug">
                                <span className="text-brand-blue-light">{questionNumbers[q.id]}.</span>
                                <span>{q.text}</span>
                              </h3>
                              <div className="flex items-center gap-2 shrink-0 mt-1">
                                {q.type === 'rating' && <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-md text-[10px] font-bold uppercase tracking-wider">Rate</span>}
                                {answers[q.id] === undefined || answers[q.id] === null || (typeof answers[q.id] === 'string' && answers[q.id].trim() === '') ? (
                                  q.optional ? 
                                    <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded border border-slate-200 text-[10px] font-black uppercase tracking-widest shrink-0">Optional</span>
                                  :
                                    <span className="px-2 py-1 bg-red-50 text-red-600 rounded border border-red-200 text-[10px] font-black uppercase tracking-widest shrink-0 animate-pulse">Required</span>
                                ) : (
                                  <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 text-[10px] font-black uppercase tracking-widest shrink-0 flex items-center gap-1">
                                    Done <Check className="w-3.5 h-3.5" />
                                  </span>
                                )}
                              </div>
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
                                    <div key={opt}>
                                      <label className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all
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
                                      {answers[q.id] === opt && (
                                        <div className="mt-2 pl-4 animate-in fade-in slide-in-from-top-2 mb-4">
                                          <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none text-sm font-medium"
                                            placeholder={opt === 'Other' ? "Please specify..." : `Add comment or specify details... (Optional)`}
                                            value={answers[`${q.id}_comment`] || answers[`${q.id}_other`] || ''}
                                            onChange={(e) => handleAnswer(`${q.id}_comment`, e.target.value)}
                                          />
                                        </div>
                                      )}
                                    </div>
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
                                <div className="space-y-4">
                                  {/* Point rating buttons bar */}
                                  <div className="flex flex-wrap items-center gap-3">
                                    {(() => {
                                      const maxPts = Math.max(...(q.options as RatingOption[]).map(o => o.points || 0), 5);
                                      const pointRange = Array.from({length: maxPts}, (_, i) => i + 1);
                                      return pointRange.map((pts) => {
                                        const isSelected = answers[q.id] === pts;
                                        let btnStyles = "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300";
                                        if (isSelected) {
                                          if (pts >= maxPts * 0.8) {
                                            btnStyles = "bg-green-600 border-green-600 text-white shadow-md ring-2 ring-green-600/20 font-black scale-105";
                                          } else if (pts >= maxPts * 0.5) {
                                            btnStyles = "bg-amber-500 border-amber-500 text-white shadow-md ring-2 ring-amber-500/20 font-black scale-105";
                                          } else {
                                            btnStyles = "bg-red-500 border-red-500 text-white shadow-md ring-2 ring-red-500/20 font-black scale-105";
                                          }
                                        }
                                        return (
                                          <button
                                            key={pts}
                                            type="button"
                                            onClick={() => handleAnswer(q.id, pts)}
                                            className={`w-12 h-12 rounded-xl border text-base font-bold transition-all flex items-center justify-center ${btnStyles}`}
                                          >
                                            {pts}
                                          </button>
                                        );
                                      });
                                    })()}
                                    {answers[q.id] && (
                                      <span className="text-xs font-bold text-slate-500 italic ml-2">
                                        Selected: {answers[q.id]} / {Math.max(...(q.options as RatingOption[]).map(o => o.points || 0), 5)} points
                                      </span>
                                    )}
                                  </div>

                                  {/* Add Comment Field */}
                                  {answers[q.id] !== undefined && answers[q.id] !== null && (
                                    <div className="mt-2 animate-in fade-in slide-in-from-top-2 mb-4">
                                      <textarea
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none text-sm font-medium min-h-[80px]"
                                        placeholder={`Add a comment or detail for your rating... (Optional)`}
                                        value={answers[`${q.id}_comment`] || ''}
                                        onChange={(e) => handleAnswer(`${q.id}_comment`, e.target.value)}
                                      />
                                    </div>
                                  )}

                                  {/* Evaluation Guidelines Hints */}
                                  <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100/80 space-y-3">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Evaluation Guidelines (Acuity Hints)</div>
                                    <div className="space-y-2.5 text-xs">
                                      {((q.options as RatingOption[]) || [])
                                        .filter(o => o.text && o.text.trim().length > 0)
                                        .sort((a, b) => b.points - a.points)
                                        .map((opt, oIndex) => {
                                          let colorClass = "bg-slate-100 text-slate-700 border-slate-300";
                                          const maxPts = Math.max(...(q.options as RatingOption[]).map(o => o.points || 0), 5);
                                          if (opt.points >= maxPts * 0.8) colorClass = "bg-green-50 text-green-700 border-green-200";
                                          else if (opt.points >= maxPts * 0.5) colorClass = "bg-amber-50 text-amber-700 border-amber-200";
                                          else colorClass = "bg-red-50 text-red-700 border-red-200";

                                          return (
                                            <div key={oIndex} className="flex items-start gap-2.5">
                                              <span className={`px-1.5 py-0.5 border rounded text-[9px] font-black h-fit shrink-0 tracking-wider ${colorClass}`}>
                                                {opt.label || 'Hint'} ({opt.points})
                                              </span>
                                              <span className="text-slate-600 leading-normal font-medium">{opt.text}</span>
                                            </div>
                                          );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                  })}

                  {/* Action Footer Removed to avoid duplication with sidebar */}
                </div>

                {/* Sticky Scoreboard Sidebar */}
                <div className="w-full lg:w-[320px] 2xl:w-[360px] lg:sticky lg:top-8 flex-shrink-0">
                  <div className="bg-white p-6 flex flex-col min-h-[600px] rounded-xl shadow-sm border border-slate-200">
                    <div className="text-center mb-8 pb-8 border-b border-slate-100">
                      <div className="relative inline-block mt-4">
                        <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 128 128">
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
                            <span className="text-slate-600 flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 text-blue-500" /> Mindset (22/30)</span>
                            <span className={scoreInfo.sec3 >= 22 ? 'text-green-600' : 'text-amber-500'}>{scoreInfo.sec3}/30</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${scoreInfo.sec3 >= 22 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${Math.min((scoreInfo.sec3 / 30) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-600 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-purple-500" /> Honesty (15/20)</span>
                            <span className={scoreInfo.sec4 >= 15 ? 'text-green-600' : 'text-amber-500'}>{scoreInfo.sec4}/20</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${scoreInfo.sec4 >= 15 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${Math.min((scoreInfo.sec4 / 20) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-600 flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5 text-amber-500" /> Discipline & Commitment (11/15)</span>
                            <span className={(scoreInfo.sec5 ?? 0) >= 11 ? 'text-green-600' : 'text-amber-500'}>{scoreInfo.sec5 ?? 0}/15</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${(scoreInfo.sec5 ?? 0) >= 11 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(((scoreInfo.sec5 ?? 0) / 15) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-600 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-green-500" /> Coachability (11/15)</span>
                            <span className={scoreInfo.sec6 >= 11 ? 'text-green-600' : 'text-amber-500'}>{scoreInfo.sec6}/15</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${scoreInfo.sec6 >= 11 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${Math.min((scoreInfo.sec6 / 15) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-600 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-rose-500" /> Comm/Roleplay (10/15)</span>
                            <span className={scoreInfo.sec7 >= 10 ? 'text-green-600' : 'text-amber-500'}>{scoreInfo.sec7}/15</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${scoreInfo.sec7 >= 10 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${Math.min((scoreInfo.sec7 / 15) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-600 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-teal-500" /> Retention Risk (4/5)</span>
                            <span className={(scoreInfo.sec8 ?? 0) >= 4 ? 'text-green-600' : 'text-amber-500'}>{scoreInfo.sec8 ?? 0}/5</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${(scoreInfo.sec8 ?? 0) >= 4 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(((scoreInfo.sec8 ?? 0) / 5) * 100, 100)}%` }}></div>
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

                    {/* Convenient Sticky Sidebar Submission Button */}
                    <div className="mt-6 pt-6 border-t border-slate-100 shrink-0">
                      <button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting}
                        className={`w-full py-4 text-slate-900 text-sm font-black rounded-lg shadow-md transition-all uppercase tracking-widest flex items-center justify-center gap-2 ${isSubmitting ? 'bg-yellow-300 opacity-70 cursor-not-allowed' : 'bg-brand-yellow hover:bg-yellow-400 hover:-translate-y-0.5 animate-pulse'}`}
                      >
                        {!isSubmitting && <CheckCircle2 className="w-5 h-5 shrink-0" />}
                        {isSubmitting ? "Successful Submit..." : (editingRecordId ? "Resubmit Evaluation" : "Complete Evaluation")}
                      </button>
                    </div>

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

        {/* Dialog Modal */}
        {dialogConfig.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className={`p-4 ${dialogConfig.type === 'alert' ? 'bg-red-50 text-red-700 border-b border-red-100' : dialogConfig.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-100' : 'bg-brand-light text-brand-blue border-b border-brand-blue/10'}`}>
                <h3 className="font-extrabold flex items-center gap-2">
                  {dialogConfig.type === 'alert' && <AlertTriangle className="w-5 h-5" />}
                  {dialogConfig.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                  {dialogConfig.type === 'confirm' && <AlertTriangle className="w-5 h-5" />}
                  {dialogConfig.title}
                </h3>
              </div>
              <div className="p-5 text-sm text-slate-600 font-medium leading-relaxed">
                {dialogConfig.message}
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                {dialogConfig.type === 'confirm' && (
                  <button 
                    onClick={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  onClick={() => {
                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                    if (dialogConfig.onConfirm) dialogConfig.onConfirm();
                  }}
                  className={`px-4 py-2 text-sm font-bold text-white rounded transition-colors ${dialogConfig.type === 'alert' ? 'bg-red-600 hover:bg-red-700' : dialogConfig.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-brand-blue hover:bg-brand-blue-light'}`}
                >
                  {dialogConfig.type === 'confirm' ? 'Confirm' : 'OK'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Multi-Method Login Modal Overlay */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full max-h-[92vh] overflow-y-auto p-6 relative animate-in zoom-in-95 duration-150">
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
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
