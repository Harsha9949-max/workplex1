import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  ShieldCheck, 
  Trophy, 
  Flame, 
  Calendar, 
  Share2, 
  ShoppingBag, 
  Send, 
  ArrowLeft,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { useParams, Link } from 'react-router-dom';

// --- Public Profile Component ---
export function PublicProfile() {
  const { username } = useParams();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setUserData({ id: snap.docs[0].id, ...snap.docs[0].data() });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [username]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#E8B84B] border-t-transparent rounded-full animate-spin"></div></div>;
  if (!userData) return <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-white p-6"><h1 className="text-2xl font-bold mb-4">User Not Found</h1><Link to="/" className="text-[#E8B84B]">Go Home</Link></div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pb-24">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <img 
              src={userData.photoURL || 'https://picsum.photos/seed/user/200'} 
              className="w-24 h-24 rounded-3xl object-cover border-2 border-[#E8B84B]" 
              alt="Profile" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-2 -right-2 bg-[#E8B84B] text-black text-xs font-bold px-2 py-1 rounded-lg shadow-lg">
              {userData.level || 'Bronze'}
            </div>
          </div>
          <h1 className="text-2xl font-black mb-1">{userData.name}</h1>
          <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">{userData.venture} {userData.role}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-[#111111] p-4 rounded-2xl border border-gray-800 flex flex-col items-center">
            <Flame className="text-[#E8B84B] mb-2" size={24} />
            <span className="text-xl font-bold">{userData.streak || 0}</span>
            <span className="text-xs text-gray-500 uppercase font-bold">Day Streak</span>
          </div>
          <div className="bg-[#111111] p-4 rounded-2xl border border-gray-800 flex flex-col items-center">
            <Calendar className="text-[#00C9A7] mb-2" size={24} />
            <span className="text-sm font-bold">{new Date(userData.joinedAt?.seconds * 1000).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
            <span className="text-xs text-gray-500 uppercase font-bold">Joined</span>
          </div>
        </div>

        {userData.showTotalEarnedPublicly !== false && (
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#111111] p-6 rounded-3xl border border-gray-800 mb-8 text-center">
            <p className="text-gray-500 text-xs uppercase font-bold tracking-widest mb-1">Total Career Earnings</p>
            <h2 className="text-4xl font-black text-[#E8B84B]">₹{(userData.totalEarned || 0).toLocaleString()}</h2>
          </div>
        )}

        <div className="mb-8">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <ShieldCheck className="text-[#E8B84B]" size={20} />
            Badges Earned
          </h3>
          <div className="flex flex-wrap gap-3">
            {userData.badges?.length > 0 ? userData.badges.map((badge: string, idx: number) => (
              <div key={idx} className="bg-[#1A1A1A] px-3 py-1.5 rounded-full border border-gray-800 text-xs font-bold text-gray-300">
                {badge}
              </div>
            )) : (
              <p className="text-gray-600 text-sm italic">No badges earned yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <button 
            onClick={handleShare}
            className="w-full bg-[#1A1A1A] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 border border-gray-800 active:scale-95 transition-transform"
          >
            <Share2 size={20} /> {copied ? 'Link Copied!' : 'Share Profile'}
          </button>
          <Link 
            to={`/?ref=${userData.id}`}
            className="w-full bg-[#E8B84B] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(232,184,75,0.2)] active:scale-95 transition-transform"
          >
            Join WorkPlex <ExternalLink size={20} />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

// --- Reseller Shop Component ---
export function ResellerShop() {
  const { username } = useParams();
  const [userData, setUserData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const user = { id: snap.docs[0].id, ...snap.docs[0].data() };
          setUserData(user);
          
          const pq = query(collection(db, 'products'), where('resellerId', '==', user.id));
          const psnap = await getDocs(pq);
          setProducts(psnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username]);

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#E8B84B] border-t-transparent rounded-full animate-spin"></div></div>;
  if (!userData) return <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-white p-6"><h1 className="text-2xl font-bold mb-4">Shop Not Found</h1><Link to="/" className="text-[#E8B84B]">Go Home</Link></div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pb-24">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <img src={userData.photoURL || 'https://picsum.photos/seed/user/200'} className="w-16 h-16 rounded-2xl object-cover border border-[#E8B84B]/30" alt="Reseller" referrerPolicy="no-referrer" />
          <div>
            <h1 className="text-xl font-bold">{userData.name}'s Shop</h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{userData.venture} Partner</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {products.length > 0 ? products.map((product, idx) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-[#111111] rounded-3xl border border-gray-800 overflow-hidden flex flex-col"
            >
              <img src={product.image} className="w-full h-40 object-cover" alt={product.name} referrerPolicy="no-referrer" />
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-sm mb-1 line-clamp-2">{product.name}</h3>
                <p className="text-[#00C9A7] font-black text-lg mb-4">₹{product.price}</p>
                <button 
                  onClick={() => window.open(`${product.productUrl}?ref=${userData.id}`, '_blank')}
                  className="mt-auto w-full bg-[#E8B84B] text-black text-xs font-bold py-2.5 rounded-xl active:scale-95 transition-transform"
                >
                  Buy Now
                </button>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-2 py-20 text-center">
              <ShoppingBag className="mx-auto text-gray-700 mb-4" size={48} />
              <p className="text-gray-500 italic">No products listed yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Team Chat Component ---
export function TeamChat({ leadId, leadName }: { leadId: string, leadName: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, `teamChats/${leadId}/messages`), orderBy('timestamp', 'asc'), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [leadId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser) return;
    
    const msg = {
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || 'Anonymous',
      text: newMessage,
      timestamp: serverTimestamp()
    };
    
    setNewMessage('');
    await addDoc(collection(db, `teamChats/${leadId}/messages`), msg);
  };

  return (
    <div className="flex flex-col h-[80vh] bg-[#0A0A0A] rounded-3xl border border-gray-800 overflow-hidden">
      <div className="p-4 bg-[#111111] border-b border-gray-800 flex items-center justify-between">
        <h3 className="font-bold text-gray-300">{leadName}'s Team Chat</h3>
        <div className="w-2 h-2 bg-[#00C9A7] rounded-full animate-pulse"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === auth.currentUser?.uid;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-gray-500 mb-1 px-2">{msg.senderName}</span>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${isMe ? 'bg-[#E8B84B] text-black rounded-tr-none' : 'bg-[#1A1A1A] text-white rounded-tl-none border border-gray-800'}`}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 bg-[#111111] border-t border-gray-800 flex gap-2">
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#E8B84B]"
        />
        <button type="submit" className="bg-[#E8B84B] text-black p-3 rounded-xl active:scale-95 transition-transform">
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
