import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    sendPasswordResetEmail
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    getDocs, 
    onSnapshot, 
    deleteDoc, 
    query, 
    where, 
    serverTimestamp, 
    setDoc,
    writeBatch
} from 'firebase/firestore';

// --- CONFIGURATION ---
const CONFIG = {
    ADMIN_EMAILS: ["batuhan.demirel@wesoda.com"], 
    MANAGER_EMAILS: ["serif.kaya@wesoda.com"],
};

// --- FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyAlgVVTXzIWzA1lPpwMUEem4PDbZwmIL9Q",
  authDomain: "arge-anket.firebaseapp.com",
  projectId: "arge-anket",
  storageBucket: "arge-anket.appspot.com",
  messagingSenderId: "145826876906",
  appId: "1:145826876906:web:ba735ed44beaa7ecb4f693",
  measurementId: "G-W4HJPFHKT9"
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'survey-app-react-default';

let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.error("Firebase initialization failed:", e);
}

// --- HELPER HOOKS & COMPONENTS ---
function useUserProfile(user) {
    const [profile, setProfile] = useState(null);
    useEffect(() => {
        if (!user) {
            setProfile(null);
            return;
        }
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, user.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setProfile({ uid: user.uid, email: user.email, ...docSnap.data() });
            } else {
                if (!user.email) {
                    const newProfile = { email: null, role: 'kullanici', createdAt: serverTimestamp() };
                    setDoc(userDocRef, newProfile).then(() => setProfile({ uid: user.uid, ...newProfile }));
                    return;
                }
                const userEmail = user.email.toLowerCase();
                let role = 'kullanici';
                if (CONFIG.ADMIN_EMAILS.includes(userEmail)) role = 'admin';
                else if (CONFIG.MANAGER_EMAILS.includes(userEmail)) role = 'mudur';
                const newProfile = { email: user.email, role: role, createdAt: serverTimestamp() };
                setDoc(userDocRef, newProfile).then(() => setProfile({ uid: user.uid, ...newProfile }));
            }
        });
        return () => unsubscribe();
    }, [user]);
    return profile;
}

const Icon = ({ name, className = '' }) => <i className={`fas fa-${name} ${className}`}></i>;

// --- VIEWS / COMPONENTS (All in one file) ---

const AuthScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [isResetView, setIsResetView] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (!email) {
            setError("Lütfen e-posta adresinizi girin.");
            return;
        }
        setLoading(true);
        setError('');
        setMessage('');
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage('Şifre sıfırlama e-postası gönderildi. Lütfen gelen kutunuzu kontrol edin.');
            setIsResetView(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (isResetView) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
                    <h2 className="text-3xl font-bold text-center text-white">Şifre Sıfırla</h2>
                    <form onSubmit={handlePasswordReset} className="space-y-6">
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Kayıtlı E-posta Adresiniz" className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                        <button type="submit" disabled={loading} className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors">
                            {loading ? <Icon name="spinner" className="fa-spin" /> : 'Sıfırlama E-postası Gönder'}
                        </button>
                        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                    </form>
                    <p className="text-sm text-center">
                        <button onClick={() => setIsResetView(false)} className="font-medium text-blue-400 hover:underline">Giriş ekranına dön</button>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
                <h2 className="text-3xl font-bold text-center text-white">{isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</h2>
                {message && <p className="text-sm text-green-400 text-center bg-green-900/50 p-2 rounded-md">{message}</p>}
                <form onSubmit={handleAuthSubmit} className="space-y-6">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-posta Adresi" className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Şifre" className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    <button type="submit" disabled={loading} className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors">
                        {loading ? <Icon name="spinner" className="fa-spin" /> : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
                    </button>
                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                </form>
                <div className="text-sm text-center text-gray-400 space-y-2">
                    <p>
                        {isLogin ? "Hesabınız yok mu?" : "Zaten bir hesabınız var mı?"}{' '}
                        <button onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }} className="font-medium text-blue-400 hover:underline">
                            {isLogin ? 'Kayıt Olun' : 'Giriş Yapın'}
                        </button>
                    </p>
                    {isLogin && (
                        <p>
                            <button onClick={() => { setIsResetView(true); setError(''); setMessage(''); }} className="font-medium text-blue-400 hover:underline">Şifrenizi mi unuttunuz?</button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

const WelcomeView = () => (
    <div className="text-center h-full flex flex-col justify-center items-center">
        <Icon name="poll-h" className="fa-4x text-blue-400 mb-4" />
        <h2 className="text-3xl font-bold mb-2">Anket Uygulamasına Hoş Geldiniz</h2>
        <p className="text-gray-400">Başlamak için sol menüden bir anket seçin.</p>
    </div>
);

const CreateSurveyView = ({ userProfile, setView, setIsBusy }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [questions, setQuestions] = useState([{ type: 'multiple-choice', text: '', options: ['', ''] }]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addQuestion = (type) => {
        if (type === 'multiple-choice') {
            setQuestions([...questions, { type: 'multiple-choice', text: '', options: ['', ''] }]);
        } else if (type === 'text') {
            setQuestions([...questions, { type: 'text', text: '' }]);
        }
    };

    const handleQuestionChange = (qIndex, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].text = value;
        setQuestions(newQuestions);
    };

    const handleOptionChange = (qIndex, oIndex, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuestions(newQuestions);
    };

    const handleAddOption = (qIndex) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options.push('');
        setQuestions(newQuestions);
    };
    
    const handleRemoveOption = (qIndex, oIndex) => {
        const newQuestions = [...questions];
        if (newQuestions[qIndex].options.length <= 2) {
            alert("Bir soruda en az 2 seçenek olmalıdır.");
            return;
        }
        newQuestions[qIndex].options.splice(oIndex, 1);
        setQuestions(newQuestions);
    };

    const removeQuestion = (qIndex) => {
        if (questions.length <= 1) {
            alert("Ankette en az bir soru olmalıdır.");
            return;
        }
        const newQuestions = questions.filter((_, index) => index !== qIndex);
        setQuestions(newQuestions);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const isValid = questions.every(q => {
            if (q.type === 'multiple-choice') {
                return q.text && q.options.length >= 2 && q.options.every(opt => opt);
            }
            if (q.type === 'text') {
                return q.text;
            }
            return false;
        });

        if (!isValid) {
            alert("Lütfen tüm soruları ve (şıklı sorular için) en az iki seçeneği doldurun.");
            return;
        }
        
        setIsSubmitting(true);
        setIsBusy(true);
        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/surveys`), {
                title,
                description,
                questions,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                creatorId: userProfile.uid,
                createdAt: serverTimestamp(),
            });
            setView('welcome');
        } catch (error) {
            console.error("Error creating survey:", error);
            alert("Anket oluşturulurken hata oluştu.");
        } finally {
            setIsSubmitting(false);
            setIsBusy(false);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Yeni Anket Oluştur</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Anket Başlığı" className="w-full bg-gray-700 p-2 rounded" required disabled={isSubmitting} />
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Açıklama" className="w-full bg-gray-700 p-2 rounded" disabled={isSubmitting} />
                <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="w-full bg-gray-700 p-2 rounded" style={{colorScheme: 'dark'}} disabled={isSubmitting} />
                
                {questions.map((q, qIndex) => (
                    <div key={qIndex} className="bg-gray-800 p-4 rounded-lg space-y-3 relative">
                         <button type="button" onClick={() => removeQuestion(qIndex)} className="absolute top-2 right-2 text-gray-500 hover:text-white" title="Bu soruyu sil">&times;</button>
                        <label className="font-semibold text-white">Soru {qIndex + 1}: ({q.type === 'multiple-choice' ? 'Şıklı Soru' : 'Metin Sorusu'})</label>
                        <input type="text" value={q.text} onChange={e => handleQuestionChange(qIndex, e.target.value)} placeholder="Soru metnini girin..." className="w-full bg-gray-700 p-2 rounded" required disabled={isSubmitting} />
                        
                        {q.type === 'multiple-choice' && (
                            <div className="pl-4 space-y-2">
                                {q.options.map((opt, oIndex) => (
                                    <div key={oIndex} className="flex items-center space-x-2">
                                        <input type="text" value={opt} onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)} placeholder={`Seçenek ${oIndex + 1}`} className="w-full bg-gray-600 p-2 rounded" required disabled={isSubmitting} />
                                        <button type="button" onClick={() => handleRemoveOption(qIndex, oIndex)} className="text-red-500 hover:text-red-400 disabled:text-gray-600 disabled:cursor-not-allowed" disabled={isSubmitting || q.options.length <= 2} title="Bu seçeneği sil">
                                            <Icon name="times-circle" />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => handleAddOption(qIndex)} className="text-blue-400 text-sm hover:underline" disabled={isSubmitting}>+ Seçenek Ekle</button>
                            </div>
                        )}
                    </div>
                ))}

                <div className="flex items-center space-x-4 pt-4">
                    <button type="button" onClick={() => addQuestion('multiple-choice')} className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500 disabled:bg-gray-400" disabled={isSubmitting}>Şıklı Soru Ekle</button>
                    <button type="button" onClick={() => addQuestion('text')} className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500 disabled:bg-gray-400" disabled={isSubmitting}>Metin Sorusu Ekle</button>
                    <button type="submit" className="px-4 py-2 bg-green-600 rounded hover:bg-green-500 disabled:bg-green-400" disabled={isSubmitting}>
                        {isSubmitting ? <Icon name="spinner" className="fa-spin" /> : 'Anketi Kaydet'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const TakeSurveyView = ({ survey, userProfile, setView, setIsBusy }) => {
    const [responses, setResponses] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (survey) {
            setResponses(Array(survey.questions.length).fill(null));
        }
    }, [survey]);

    const handleResponseChange = (qIndex, value) => {
        const newResponses = [...responses];
        newResponses[qIndex] = value;
        setResponses(newResponses);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const allAnswered = responses.every((res, index) => {
            const question = survey.questions[index];
            if (question.type === 'text') return true; 
            return res !== null;
        });

        if (!allAnswered) {
            alert("Lütfen tüm şıklı soruları yanıtlayın.");
            return;
        }
        
        setIsSubmitting(true);
        setIsBusy(true);

        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/answers`), {
                surveyId: survey.id,
                userId: userProfile.uid,
                responses: responses,
                submittedAt: serverTimestamp(),
            });
            setView('welcome');
        } catch (error) {
            console.error("Error submitting survey:", error);
            alert("Anket gönderilirken bir hata oluştu.");
        } finally {
            setIsSubmitting(false);
            setIsBusy(false);
        }
    };

    if (!survey) return <WelcomeView />;

    return (
        <div>
            <h2 className="text-3xl font-bold mb-2">{survey.title}</h2>
            <p className="text-gray-400 mb-6">{survey.description}</p>
            <form onSubmit={handleSubmit} className="space-y-6">
                {survey.questions.map((q, qIndex) => (
                    <fieldset key={qIndex} className="space-y-2">
                        <legend className="text-lg font-medium text-white mb-2">{qIndex + 1}. {q.text}</legend>
                        {q.type === 'multiple-choice' ? (
                            q.options.map((opt, oIndex) => (
                                <label key={oIndex} className={`flex items-center bg-gray-700 p-3 rounded-md ${isSubmitting ? 'cursor-not-allowed' : 'hover:bg-gray-600 cursor-pointer'}`}>
                                    <input type="radio" name={`q-${qIndex}`} value={oIndex} onChange={() => handleResponseChange(qIndex, oIndex)} className="h-4 w-4 text-blue-600 bg-gray-800 border-gray-600 focus:ring-blue-500" required disabled={isSubmitting} />
                                    <span className="ml-3 text-white">{opt}</span>
                                </label>
                            ))
                        ) : (
                            <textarea value={responses[qIndex] || ''} onChange={(e) => handleResponseChange(qIndex, e.target.value)} rows="4" placeholder="Cevabınızı buraya yazın..." className="w-full bg-gray-700 p-2 rounded text-white placeholder-gray-400" disabled={isSubmitting}/>
                        )}
                    </fieldset>
                ))}
                <button type="submit" disabled={isSubmitting} className="w-full px-4 py-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed">
                    {isSubmitting ? <Icon name="spinner" className="fa-spin" /> : 'Cevapları Gönder'}
                </button>
            </form>
        </div>
    );
};

const ResultsView = ({ survey }) => {
    const [surveyAnswers, setSurveyAnswers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!survey) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        const answersQuery = query(collection(db, `artifacts/${appId}/public/data/answers`), where("surveyId", "==", survey.id));
        const unsubscribe = onSnapshot(answersQuery, (snapshot) => {
            const answers = snapshot.docs.map(doc => doc.data());
            setSurveyAnswers(answers);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [survey]);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Icon name="spinner" className="fa-spin fa-2x text-blue-500" /></div>;
    }

    if (!survey || !survey.questions) return <WelcomeView />;

    const totalVotes = surveyAnswers.length;
    const isExpired = survey.expiresAt ? survey.expiresAt.toDate() < new Date() : false;
    const isTimeless = !survey.expiresAt;
    const canViewResults = isExpired || isTimeless;

    if (!canViewResults) {
        return (
            <div className="text-center h-full flex flex-col justify-center items-center bg-gray-800 p-8 rounded-lg">
                <Icon name="lock" className="fa-4x text-yellow-400 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Sonuçlar Henüz Görüntülenemiyor</h2>
                <p className="text-gray-400">Anonimliği korumak için, sonuçlar anketin bitiş süresi dolduğunda gösterilecektir.</p>
                {survey.expiresAt && (
                    <div className="mt-4 text-sm text-gray-500">
                        <p>Bitiş Tarihi: {survey.expiresAt.toDate().toLocaleDateString('tr-TR')}</p>
                    </div>
                )}
            </div>
        );
    }
    
    return (
        <div>
            <h2 className="text-3xl font-bold mb-2">{survey.title}</h2>
            <p className="text-gray-400 mb-2">{survey.description}</p>
            <p className="text-sm text-blue-400 font-semibold mb-6">Toplam {totalVotes} kişi katıldı.</p>
            <div className="space-y-8">
                {survey.questions.map((question, qIndex) => {
                    if (question.type === 'multiple-choice') {
                        const options = question.options || [];
                        const votes = new Array(options.length).fill(0);
                        surveyAnswers.forEach(answer => {
                            if (answer.responses && typeof answer.responses[qIndex] === 'number') {
                                votes[answer.responses[qIndex]]++;
                            }
                        });

                        return (
                            <div key={qIndex} className="bg-gray-800 p-4 rounded-lg">
                                <h4 className="text-lg font-semibold text-white mb-3">{qIndex + 1}. {question.text}</h4>
                                {options.map((option, oIndex) => {
                                    const voteCount = votes[oIndex];
                                    const percentage = totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(1) : 0;
                                    return (
                                        <div key={oIndex} className="mb-2">
                                            <div className="flex justify-between items-center text-sm mb-1">
                                                <span>{option}</span>
                                                <span className="font-semibold">{voteCount} Oy ({percentage}%)</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-2.5">
                                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    }

                    if (question.type === 'text') {
                        const textAnswers = surveyAnswers
                            .map(answer => answer.responses && answer.responses[qIndex])
                            .filter(response => typeof response === 'string' && response.trim() !== '');

                        return (
                            <div key={qIndex} className="bg-gray-800 p-4 rounded-lg">
                                <h4 className="text-lg font-semibold text-white mb-3">{qIndex + 1}. {question.text}</h4>
                                {textAnswers.length > 0 ? (
                                    <div className="space-y-3 max-h-60 overflow-y-auto">
                                        {textAnswers.map((text, aIndex) => (
                                            <p key={aIndex} className="bg-gray-700 p-3 rounded-md text-gray-300 italic">"{text}"</p>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500">Bu soruya yazılı bir cevap verilmemiş.</p>
                                )}
                            </div>
                        );
                    }

                    return null;
                })}
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const userProfile = useUserProfile(user);
    
    const [surveys, setSurveys] = useState([]);
    const [userAnsweredSurveyIds, setUserAnsweredSurveyIds] = useState([]);
    const [selectedSurveyId, setSelectedSurveyId] = useState(null);
    const [view, setView] = useState('welcome');
    const [isBusy, setIsBusy] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [surveyToDelete, setSurveyToDelete] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoadingAuth(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!userProfile) return;
        
        const surveysQuery = query(collection(db, `artifacts/${appId}/public/data/surveys`));
        const unsubSurveys = onSnapshot(surveysQuery, (snapshot) => {
            const surveyList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            surveyList.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setSurveys(surveyList);
        });

        const userAnswersQuery = query(collection(db, `artifacts/${appId}/public/data/answers`), where("userId", "==", userProfile.uid));
        const unsubAnswers = onSnapshot(userAnswersQuery, (snapshot) => {
            const answeredIds = snapshot.docs.map(doc => doc.data().surveyId);
            setUserAnsweredSurveyIds(answeredIds);
        });
        
        return () => { unsubSurveys(); unsubAnswers(); };
    }, [userProfile]);

    useEffect(() => {
        if (view === 'welcome') {
            setIsBusy(false);
            setSelectedSurveyId(null);
        }
    }, [view]);

    const selectedSurvey = useMemo(() => {
        return surveys.find(s => s.id === selectedSurveyId);
    }, [surveys, selectedSurveyId]);

    const handleSelectSurvey = (id) => {
        setSelectedSurveyId(id);
        const survey = surveys.find(s => s.id === id);
        if (!survey) return;

        const isAnswered = userAnsweredSurveyIds.includes(id);
        const isExpired = survey.expiresAt ? survey.expiresAt.toDate() < new Date() : false;

        if (userProfile.role === 'mudur') {
            setView('results');
        } else if (isExpired || isAnswered) {
            setView('results');
        } else {
            setView('take');
        }
        setIsSidebarOpen(false); // Close sidebar on selection
    };

    const handleDeleteSurvey = async () => {
        if (!surveyToDelete) return;
        setIsBusy(true);
        const surveyId = surveyToDelete;
        
        try {
            const answersQuery = query(collection(db, `artifacts/${appId}/public/data/answers`), where("surveyId", "==", surveyId));
            const answersSnapshot = await getDocs(answersQuery);
            const batch = writeBatch(db);
            answersSnapshot.forEach(doc => batch.delete(doc.ref));
            const surveyRef = doc(db, `artifacts/${appId}/public/data/surveys`, surveyId);
            batch.delete(surveyRef);
            await batch.commit();
            if (selectedSurveyId === surveyId) setView('welcome');
        } catch (error) {
            console.error("Error deleting survey:", error);
            alert("Anket silinirken bir hata oluştu.");
        } finally {
            setSurveyToDelete(null);
            setShowDeleteModal(false);
            setIsBusy(false);
        }
    };

    const openDeleteModal = (e, surveyId) => {
        e.stopPropagation();
        setSurveyToDelete(surveyId);
        setShowDeleteModal(true);
    };
    
    const renderView = () => {
        switch (view) {
            case 'create':
                return <CreateSurveyView userProfile={userProfile} setView={setView} setIsBusy={setIsBusy} />;
            case 'take':
                return <TakeSurveyView survey={selectedSurvey} userProfile={userProfile} setView={setView} setIsBusy={setIsBusy} />;
            case 'results':
                return <ResultsView survey={selectedSurvey} />;
            default:
                return <WelcomeView />;
        }
    };

    if (loadingAuth) {
        return <div className="bg-gray-900 h-screen flex justify-center items-center"><Icon name="spinner" className="fa-spin fa-3x text-blue-500" /></div>;
    }

    if (!user) {
        return <AuthScreen />;
    }
    
    if (!userProfile) {
         return <div className="bg-gray-900 h-screen flex justify-center items-center"><Icon name="spinner" className="fa-spin fa-3x text-blue-500" /> <p className="text-white ml-4">Profil oluşturuluyor...</p></div>;
    }

    return (
        <>
            <div className="relative min-h-screen md:flex bg-gray-900 text-gray-200">
                {/* Mobile Sidebar Overlay */}
                {isSidebarOpen && <div className="fixed inset-0 bg-black opacity-50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
                
                {/* Sidebar */}
                <aside className={`fixed inset-y-0 left-0 bg-gray-800 w-64 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-200 ease-in-out z-30 flex flex-col`}>
                    <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                        <h1 className="text-xl font-bold text-white">Anketler</h1>
                        {(userProfile.role === 'mudur' || userProfile.role === 'admin') && (
                            <button onClick={() => { setView('create'); setIsSidebarOpen(false); }} className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={isBusy}>
                                <Icon name="plus" className="mr-1" /> Yeni
                            </button>
                        )}
                    </header>
                    <div className="flex-grow p-2 overflow-y-auto">
                        {surveys.map(survey => {
                            const isAnswered = userAnsweredSurveyIds.includes(survey.id);
                            const isExpired = survey.expiresAt ? survey.expiresAt.toDate() < new Date() : false;
                            return (
                                <div key={survey.id} onClick={() => !isBusy && handleSelectSurvey(survey.id)} className={`bg-gray-700 rounded-lg p-3 mb-2 transition-all ${isAnswered || isExpired ? 'opacity-60' : ''} ${isBusy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-600'}`}>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-white mb-1">{survey.title}</h3>
                                        {isAnswered && <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">Yanıtlandı</span>}
                                    </div>
                                    <p className="text-sm text-gray-400 truncate">{survey.description}</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <div className="text-xs">{isExpired ? <span className="text-red-400">Süresi Doldu</span> : (survey.expiresAt ? <span className="text-yellow-400">Bitiş: {survey.expiresAt.toDate().toLocaleDateString('tr-TR')}</span> : <span className="text-green-400">Süresiz</span>)}</div>
                                        {(userProfile.role === 'admin' || userProfile.role === 'mudur') && (
                                            <button onClick={(e) => openDeleteModal(e, survey.id)} className="text-red-400 hover:text-red-300 transition-colors text-xs font-semibold" title="Anketi Sil">
                                                <Icon name="trash-alt" className="mr-1" /> Sil
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <footer className="p-3 border-t border-gray-700 text-xs text-gray-400">
                        <p>{userProfile.email} ({userProfile.role})</p>
                        <button onClick={() => signOut(auth)} className="w-full mt-2 text-left text-red-400 hover:underline">Çıkış Yap</button>
                    </footer>
                </aside>
                
                {/* Main Content */}
                <main className="flex-1 flex flex-col">
                    <header className="md:hidden p-4 bg-gray-800 border-b border-gray-700 flex items-center">
                        <button onClick={() => setIsSidebarOpen(true)} className="text-white">
                            <Icon name="bars" className="fa-lg" />
                        </button>
                        <h2 className="text-lg font-bold text-white ml-4">Anket Uygulaması</h2>
                    </header>
                    <div className="p-4 md:p-6 overflow-y-auto flex-grow">
                        {renderView()}
                    </div>
                </main>
            </div>
            {showDeleteModal && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-xl">
                        <h3 className="text-lg font-bold mb-4">Anketi Sil</h3>
                        <p className="text-gray-300 mb-6">Bu anketi ve tüm yanıtlarını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
                        <div className="flex justify-end space-x-4">
                            <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-md font-semibold text-white bg-gray-600 hover:bg-gray-700 transition-colors">İptal</button>
                            <button onClick={handleDeleteSurvey} className="px-4 py-2 rounded-md font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">Onayla ve Sil</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
