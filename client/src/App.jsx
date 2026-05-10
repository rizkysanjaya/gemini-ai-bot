/**
 * Tujuan: Komponen utama (Aplikasi Chatbot) untuk Calis-AI.
 * Dipakai oleh: src/main.jsx.
 * Dependensi: react, react-markdown.
 * Daftar Fungsi: 
 *  - App: Mengelola state sesi obrolan (history), input (teks dan gambar), dan request ke backend.
 * Side Effect: Membaca/menulis localStorage (migrasi calis-ai-chat -> calis-ai-sessions), HTTP POST ke /api/chat.
 */

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

function App() {
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const defaultMessage = { 
    role: 'model', 
    text: 'Halo Bro! Gue Calis-AI, pelatih kalistenik lu. Mau mulai dari mana hari ini? Tanya aja soal form, jadwal pemula, atau kasih liat foto form lu buat gue cek!',
    timestamp: getCurrentTime()
  };

  // State Profile Dinamis
  const [userProfile] = useState({ name: 'Rzky', initial: 'R' });

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
      if (parsedLegacy.length > 1) { 
        return [
          { id: Date.now().toString(), title: 'Sesi Sebelumnya', messages: parsedLegacy.map(m => ({...m, timestamp: '12.00'})) }
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
  const [attachment, setAttachment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

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
      messages: [{...defaultMessage, timestamp: getCurrentTime()}]
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    setAttachment(null);
  };

  const handleSwitchSession = (id) => {
    setCurrentSessionId(id);
    setAttachment(null);
  };

  const handleDeleteSession = (id, e) => {
    e.stopPropagation();
    if(confirm('Yakin mau hapus sesi ini?')) {
      const updatedSessions = sessions.filter(s => s.id !== id);
      if (updatedSessions.length === 0) {
        // Jika habis, buat sesi baru otomatis
        const newSession = { id: Date.now().toString(), title: 'Obrolan Baru', messages: [{...defaultMessage, timestamp: getCurrentTime()}] };
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

  // Kompresi Gambar dengan Canvas untuk menghemat localStorage
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 jpeg quality 0.7
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        const base64Data = dataUrl.split(',')[1];
        setAttachment({
          mimeType: 'image/jpeg',
          data: base64Data,
          previewUrl: dataUrl
        });
        
        if(fileInputRef.current) fileInputRef.current.value = "";
      };
    };
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handlePromptClick = (text) => {
    handleSubmit(null, text);
  };

  const handleSubmit = async (e, overrideText = null) => {
    if (e) e.preventDefault();
    
    const textToSubmit = overrideText !== null ? overrideText : input;
    if ((!textToSubmit.trim() && !attachment) || isLoading) return;

    const userMessageText = textToSubmit.trim();
    setInput('');
    const currentAttachment = attachment;
    setAttachment(null);
    
    // Logika auto-title jika ini pesan pertama user di sesi ini
    let newTitle = currentSession.title;
    if (messages.length === 1 && currentSession.title === 'Obrolan Baru') {
      if (userMessageText) {
        const words = userMessageText.split(' ');
        newTitle = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
      } else if (currentAttachment) {
        newTitle = "Analisis Gambar";
      }
    }

    const newMessageObj = { role: 'user', text: userMessageText, timestamp: getCurrentTime() };
    if (currentAttachment) {
      newMessageObj.image = { mimeType: currentAttachment.mimeType, data: currentAttachment.data };
    }

    const newMessages = [...messages, newMessageObj];
    
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
        updateSessionsState([...newMessages, { role: 'model', text: data.result, timestamp: getCurrentTime() }]);
      } else {
        updateSessionsState([...newMessages, { role: 'model', text: 'Sori bro, lagi ada gangguan server. Coba lagi bentar ya.', timestamp: getCurrentTime() }]);
      }
    } catch (err) {
      updateSessionsState([...newMessages, { role: 'model', text: 'Koneksi gagal bro, cek internet lu.', timestamp: getCurrentTime() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background font-body overflow-hidden">
      
      {/* Sidebar - Tetap menggunakan warna tema tapi dimodifikasi layoutnya */}
      <aside className="w-72 bg-surface-container border-r border-surface-variant flex-col hidden md:flex shrink-0">
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 bg-primary text-on-primary p-2 rounded-xl mb-6 shadow-sm w-max">
            <span className="material-symbols-outlined text-[20px]">fitness_center</span>
            <h1 className="text-lg font-headline font-extrabold pr-2">Calis-AI</h1>
          </div>
          
          <button 
            onClick={handleNewChat}
            className="w-full flex items-center gap-3 bg-surface border border-outline text-on-surface hover:bg-surface-variant font-bold py-3 px-4 rounded-xl transition shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add_box</span>
            Chat baru
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 scroll-smooth mt-4">
          <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2 px-2">HARI INI</p>
          {sessions.map((session) => (
            <div 
              key={session.id}
              onClick={() => handleSwitchSession(session.id)}
              className={`group flex items-center justify-between cursor-pointer px-4 py-2.5 rounded-lg transition ${currentSessionId === session.id ? 'bg-primary/10 text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-variant font-medium'}`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="material-symbols-outlined shrink-0 text-[18px] opacity-70">check_box_outline_blank</span>
                <span className="truncate text-sm">{session.title}</span>
              </div>
              <button 
                onClick={(e) => handleDeleteSession(session.id, e)} 
                className={`text-error hover:opacity-70 ${currentSessionId === session.id ? 'block' : 'hidden group-hover:block'}`}
                title="Hapus Sesi"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          ))}
        </nav>

        {/* User Profile Area (Mockup style) */}
        <div className="p-4 border-t border-surface-variant flex items-center justify-between hover:bg-surface-variant cursor-pointer transition">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold shadow-sm">
              {userProfile.initial}
            </div>
            <span className="font-bold text-sm text-on-surface">{userProfile.name}</span>
          </div>
          <span className="material-symbols-outlined text-outline">settings</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-background relative">
        
        {/* Mobile Navbar */}
        <header className="h-16 bg-surface/80 backdrop-blur border-b border-surface-variant flex items-center justify-between px-4 md:hidden shrink-0 shadow-sm z-10 sticky top-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">fitness_center</span>
            <h1 className="text-lg font-headline font-extrabold text-primary">Calis-AI</h1>
          </div>
          <button onClick={handleNewChat} className="flex items-center justify-center p-2 bg-surface text-on-surface border border-surface-variant rounded-full hover:bg-surface-variant transition shadow-sm">
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
        </header>

        {/* Chat Interface */}
        <div className="flex-1 overflow-y-auto w-full scroll-smooth pb-32">
          <div className="max-w-3xl mx-auto p-4 md:p-6 flex flex-col gap-6">
            
            {/* Hari ini Pill */}
            <div className="flex justify-center my-2">
              <span className="bg-surface-variant text-on-surface-variant px-4 py-1.5 rounded-full text-xs font-bold shadow-sm border border-outline/20">
                Hari ini
              </span>
            </div>

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                
                {/* Mode AI (Kiri) */}
                {msg.role !== 'user' && (
                  <div className="flex gap-3 max-w-[85%] sm:max-w-[75%]">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0 shadow-sm mt-1">
                      <span className="material-symbols-outlined text-[16px]">fitness_center</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="bg-surface text-on-surface rounded-3xl rounded-tl-none px-6 py-4 shadow-sm border border-surface-variant relative group">
                        <div className="prose prose-sm sm:prose-base max-w-none [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1 px-2">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleCopy(msg.text, idx)}
                            className="text-outline hover:text-primary transition flex items-center"
                            title="Copy response"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {copiedIndex === idx ? 'check' : 'content_copy'}
                            </span>
                          </button>
                          <button className="text-outline hover:text-primary transition flex items-center" title="Regenerate">
                            <span className="material-symbols-outlined text-[14px]">refresh</span>
                          </button>
                        </div>
                        <span className="text-[11px] font-medium text-outline">{msg.timestamp || '09.14'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mode User (Kanan) */}
                {msg.role === 'user' && (
                  <div className="flex gap-3 max-w-[85%] sm:max-w-[75%] flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold shrink-0 shadow-sm mt-1">
                      {userProfile.initial}
                    </div>
                    <div className="flex flex-col gap-1 items-end w-full">
                      <div className="bg-primary text-on-primary rounded-3xl rounded-tr-none px-6 py-4 shadow-sm relative group overflow-hidden">
                        {msg.image && (
                          <img 
                            src={`data:${msg.image.mimeType};base64,${msg.image.data}`} 
                            alt="Uploaded visual" 
                            className="max-w-full rounded-xl mb-3 max-h-64 object-cover border border-white/20"
                          />
                        )}
                        {msg.text && <p className="font-medium text-[15px] leading-relaxed">{msg.text}</p>}
                      </div>
                      <span className="text-[11px] font-medium text-outline px-2">{msg.timestamp || '09.15'}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                 <div className="flex gap-3 max-w-[85%]">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0 shadow-sm mt-1">
                      <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                    </div>
                    <div className="bg-surface text-on-surface-variant rounded-3xl rounded-tl-none px-6 py-4 shadow-sm border border-surface-variant flex items-center gap-3">
                      <span className="font-medium text-sm">Sedang mengetik...</span>
                    </div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Floating Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-10 pb-4">
          <div className="max-w-3xl mx-auto px-4 md:px-6 w-full flex flex-col relative">
            
            {/* Image Preview Overlay */}
            {attachment && (
              <div className="absolute -top-24 left-8 bg-surface p-2 border border-surface-variant rounded-2xl shadow-lg z-20">
                <div className="relative">
                  <img 
                    src={attachment.previewUrl} 
                    alt="Preview" 
                    className="h-20 w-20 object-cover rounded-xl border border-outline/20"
                  />
                  <button 
                    onClick={removeAttachment}
                    className="absolute -top-3 -right-3 bg-error text-white rounded-full p-1 shadow-md hover:scale-110 transition"
                  >
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-surface border border-surface-variant rounded-2xl p-3 flex flex-col gap-3 shadow-lg">
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="Tanya soal form pull-up, kirim foto alat..." 
                className="w-full bg-transparent text-on-surface px-2 py-1 font-medium text-[15px] focus:outline-none placeholder:text-outline transition"
                disabled={isLoading}
              />
              
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2 overflow-x-auto" style={{scrollbarWidth: 'none'}}>
                  {messages.length === 1 && (
                    <>
                      <button type="button" onClick={() => handlePromptClick("Program pemula")} className="whitespace-nowrap px-3 py-1.5 rounded-lg border border-surface-variant text-xs font-medium text-outline hover:text-primary hover:border-primary transition bg-transparent">Program pemula</button>
                      <button type="button" onClick={() => handlePromptClick("Cek form saya")} className="whitespace-nowrap px-3 py-1.5 rounded-lg border border-surface-variant text-xs font-medium text-outline hover:text-primary hover:border-primary transition bg-transparent">Cek form saya</button>
                      <button type="button" onClick={() => handlePromptClick("Jadwal latihan")} className="whitespace-nowrap px-3 py-1.5 rounded-lg border border-surface-variant text-xs font-medium text-outline hover:text-primary hover:border-primary transition bg-transparent">Jadwal latihan</button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-lg border border-surface-variant text-on-surface-variant hover:bg-surface-variant transition flex items-center justify-center shrink-0" title="Attach Image">
                    <span className="material-symbols-outlined text-[18px]">attach_file</span>
                  </button>
                  <button type="submit" disabled={isLoading || (!input.trim() && !attachment)} className="w-10 h-10 rounded-lg border border-surface-variant bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container hover:border-transparent transition flex items-center justify-center shrink-0 disabled:opacity-40">
                    <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                  </button>
                </div>
              </div>
            </form>
            
            <p className="text-center text-[11px] text-outline mt-3 font-medium tracking-wide">
              calis-ai · v0.1 · konsultasi cedera selalu ke profesional
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
