import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, ADMIN_EMAILS } from './firebase';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Search from './pages/Search';
import Notifications from './pages/Notifications';
import Projects from './pages/Projects';
import Messages from './pages/Messages';
import Auth from './pages/Auth';
import Navbar from './components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db!, 'users', firebaseUser.uid);
        const snap = await getDoc(userRef).catch(() => null);
        if (!snap?.exists()) {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Anonymous Developer',
            photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
            bio: 'New developer on Typo',
            techStack: [],
            role: ADMIN_EMAILS.includes(firebaseUser.email ?? '') ? 'admin' : 'user',
            createdAt: serverTimestamp(),
          }).catch(console.error);
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-[#00ff00] font-mono text-xl tracking-widest"
        >
          TYPO_INIT...
        </motion.div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] font-sans selection:bg-[#00ff00] selection:text-black">
        {user && <Navbar user={user} />}
        <main className={user ? 'pt-16 pb-20 md:pb-0 md:pl-64' : ''}>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/auth"             element={!user ? <Auth /> : <Navigate to="/" />} />
              <Route path="/"                 element={user ? <Home user={user} /> : <Navigate to="/auth" />} />
              <Route path="/profile/:uid"     element={user ? <Profile currentUser={user} /> : <Navigate to="/auth" />} />
              <Route path="/search"           element={user ? <Search /> : <Navigate to="/auth" />} />
              <Route path="/projects"         element={user ? <Projects user={user} /> : <Navigate to="/auth" />} />
              <Route path="/notifications"    element={user ? <Notifications user={user} /> : <Navigate to="/auth" />} />
              <Route path="/messages"         element={user ? <Messages user={user} /> : <Navigate to="/auth" />} />
              <Route path="/messages/:convId" element={user ? <Messages user={user} /> : <Navigate to="/auth" />} />
              <Route path="*"                 element={<Navigate to="/" />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </Router>
  );
}
