/**
 * Tujuan: Komponen utama (Aplikasi Chatbot) untuk Calis-AI.
 * Dipakai oleh: src/main.jsx.
 * Dependensi: react, react-markdown.
 * Daftar Fungsi: 
 *  - App: Mengelola state sesi obrolan (history), input, dan request ke backend.
 * Side Effect: Membaca/menulis localStorage (migrasi calis-ai-chat -> calis-ai-sessions), HTTP POST ke /api/chat.
 */

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

function App() {
  const defaultMessage = { role: 'model', text: 'Halo Bro! Gue Calis-AI, pelatih kalistenik lu. Mau mulai dari mana hari ini? Tanya aja soal form, jadwal pemula, atau rekomendasi reps/sets!' };

  // State untuk menyimpan daftar sesi
  const [sessions, setSessions] = useState(() => {
    const savedSessions = localStorage.getItem('calis-ai-sessions');
    if (savedSessions) {
      return JSON.parse(savedSessions);
    }
    
    // Migrasi dari single-chat lama ke multi-session jika ada
    const legacySaved = localStorage.getItem('calis-ai-chat');
    if (legacySaved) {
      const parsedLegacy = JSON.parse(legacySaved);
      if (parsedLegacy.length > 1) { // Lebih dari sekadar default message
        return [
          { id: Date.now().toString(), title: 'Sesi Sebelumnya', messages: parsedLegacy }
        ];
      }
    }
    
    // Default jika benar-benar baru
    return [
      { id: Date.now().toString(), title: 'Obrolan Baru', messages: [defaultMessage] }
    ];
  });

  const [currentSessionId, setCurrentSessionId] = useState(() => sessions[0]?.id);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Ambil data sesi yang aktif
  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
  const messages = currentSession?.messages || [];

  // Sinkronisasi ke LocalStorage setiap ada perubahan pada sessions
  useEffect(() => {
    localStorage.setItem('calis-ai-sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Auto-scroll ke pesan terbawah
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewChat = () => {
    const newSession = {
      id: Date.now().toString(),
      title: 'Obrolan Baru',
      messages: [defaultMessage]
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
  };

  const handleSwitchSession = (id) => {
    setCurrentSessionId(id);
  };

  const handleDeleteSession = (id, e) => {
    e.stopPropagation();
    if(confirm('Yakin mau hapus sesi ini?')) {
      const updatedSessions = sessions.filter(s => s.id !== id);
      if (updatedSessions.length === 0) {
        // Jika habis, buat sesi baru otomatis
        const newSession = { id: Date.now().toString(), title: 'Obrolan Baru', messages: [defaultMessage] };
        setSessions([newSession]);
        setCurrentSessionId(newSession.id);
      } else {
        setSessions(updatedSessions);
        if (currentSessionId === id) {
          setCurrentSessionId(updatedSessions[0].id);
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessageText = input.trim();
    setInput('');
    
    // Logika auto-title jika ini pesan pertama user di sesi ini (messages.length == 1 berarti hanya ada 1 pesan model)
    let newTitle = currentSession.title;
    if (messages.length === 1 && currentSession.title === 'Obrolan Baru') {
      const words = userMessageText.split(' ');
      newTitle = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
    }

    const newMessages = [...messages, { role: 'user', text: userMessageText }];
    
    // Update local state terlebih dahulu
    const updateSessionsState = (updatedMessages) => {
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, title: newTitle, messages: updatedMessages } 
          : s
      ));
    };

    updateSessionsState(newMessages);
    setIsLoading(true);

    // Context limit (kirim 15 pesan terakhir ke backend)
    const contextToSend = newMessages.slice(-15);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation: contextToSend }),
      });

      const data = await response.json();
      if (response.ok && data.result) {
        updateSessionsState([...newMessages, { role: 'model', text: data.result }]);
      } else {
        updateSessionsState([...newMessages, { role: 'model', text: 'Sori bro, lagi ada gangguan server. Coba lagi bentar ya.' }]);
      }
    } catch (err) {
      updateSessionsState([...newMessages, { role: 'model', text: 'Koneksi gagal bro, cek internet lu.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-surface-container font-body overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-72 bg-surface border-r border-surface-variant flex-col hidden md:flex shrink-0">
        <div className="p-6 border-b border-surface-variant flex justify-between items-center">
          <h1 className="text-2xl font-headline font-extrabold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined">fitness_center</span>
            CaliDex
          </h1>
        </div>
        
        <div className="p-4">
          <button 
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-bold py-3 px-4 rounded-xl transition shadow-sm"
          >
            <span className="material-symbols-outlined">add</span>
            Chat Baru
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 pt-0 flex flex-col gap-2 scroll-smooth">
          <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2 px-2">Riwayat Latihan</p>
          {sessions.map((session) => (
            <div 
              key={session.id}
              onClick={() => handleSwitchSession(session.id)}
              className={`group flex items-center justify-between cursor-pointer px-4 py-3 rounded-xl transition ${currentSessionId === session.id ? 'bg-primary-container text-on-primary-container font-bold' : 'text-on-surface-variant hover:bg-surface-variant font-medium'}`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="material-symbols-outlined shrink-0 text-[20px]">chat_bubble</span>
                <span className="truncate text-sm">{session.title}</span>
              </div>
              <button 
                onClick={(e) => handleDeleteSession(session.id, e)} 
                className={`text-error hover:opacity-70 ${currentSessionId === session.id ? 'block' : 'hidden group-hover:block'}`}
                title="Hapus Sesi"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-surface-variant bg-surface">
          <div className="flex items-center gap-3 px-4 py-3 text-on-surface-variant bg-surface-variant rounded-xl font-bold shadow-sm">
            <span className="material-symbols-outlined text-primary">account_circle</span>
            <span>Mode: Pemula</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Navbar */}
        <header className="h-16 bg-surface border-b border-surface-variant flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3 md:hidden">
            <span className="material-symbols-outlined text-primary text-2xl">fitness_center</span>
            <h1 className="text-xl font-headline font-extrabold text-primary">CaliDex</h1>
          </div>
          <div className="hidden md:block">
            <h2 className="text-lg font-headline font-bold text-on-surface">{currentSession?.title || 'Trainer Dashboard'}</h2>
          </div>
          <div className="flex gap-2">
             <button onClick={handleNewChat} className="md:hidden flex items-center justify-center p-2 bg-primary text-on-primary rounded-full hover:opacity-80 transition shadow-sm">
              <span className="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
        </header>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full p-4 md:p-6 gap-4">
          
          {/* Chat Box */}
          <div className="flex-1 overflow-y-auto bg-surface rounded-3xl p-5 shadow-sm border border-surface-variant flex flex-col gap-4 scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-3xl px-6 py-3 shadow-sm ${msg.role === 'user' ? 'bg-primary text-on-primary rounded-br-sm' : 'bg-surface-container text-on-surface rounded-bl-sm border border-surface-variant'}`}>
                  {msg.role === 'user' ? (
                    <p className="font-medium text-on-primary">{msg.text}</p>
                  ) : (
                    <div className="prose prose-sm sm:prose-base max-w-none text-on-surface [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-surface-container text-on-surface-variant rounded-3xl px-6 py-3 rounded-bl-sm border border-surface-variant flex items-center gap-3">
                  <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                  <span className="font-medium text-sm">Mengetik balasan...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="flex gap-3 shrink-0">
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Tanya soal form pull-up, jadwal pemula..." 
              className="flex-1 bg-surface border border-surface-variant text-on-surface rounded-full px-6 py-4 font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition shadow-sm"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="bg-primary hover:bg-primary-container hover:text-on-primary-container text-on-primary font-bold w-14 h-14 rounded-full transition disabled:opacity-50 flex items-center justify-center shadow-md shrink-0"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>

        </div>
      </main>
    </div>
  );
}

export default App;
