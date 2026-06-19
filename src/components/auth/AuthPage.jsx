import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from '../../firebase/firebaseConfig';

const AuthPage = ({ onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            let userCredential;
            if (isLogin) {
                userCredential = await signInWithEmailAndPassword(auth, email, password);
            } else {
                userCredential = await createUserWithEmailAndPassword(auth, email, password);
                // Create a user document in Firestore upon signup
                const userDocRef = doc(db, "users", userCredential.user.uid);
                await setDoc(userDocRef, {
                    folders: [{ id: 1, name: 'General' }],
                    decks: [{ id: 101, folderId: 1, title: 'Example Module', content: 'Welcome! Add notes here.', notes: 'Welcome! Add notes here.' }],
                    subscription: {
                        tier: 'free',
                        credits: 180
                    },
                    profile: { age: '', degree: '' },
                    createdAt: serverTimestamp()
                });
            }
            onAuthSuccess(userCredential.user);
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        }
    };

    return (
        <div className="w-full h-screen flex items-center justify-center bg-slate-100">
            <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-xl">
                <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">KonDeck</h2>
                <p className="text-center text-slate-500 mb-6">{isLogin ? 'Welcome back!' : 'Create your account'}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border rounded-lg" required />
                    <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-lg" required />
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <button type="submit" className="w-full p-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">{isLogin ? 'Log In' : 'Sign Up'}</button>
                </form>
                <p className="text-center text-sm text-slate-500 mt-6">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-bold text-indigo-600 hover:underline ml-1">
                        {isLogin ? 'Sign Up' : 'Log In'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default AuthPage;
