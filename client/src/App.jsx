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
  const defaultMessage = { role: 'model', text: 'Halo Bro! Gue Calis-AI, pelatih kalistenik lu. Mau mulai dari mana hari ini? Tanya aja soal form, jadwal pemula, atau kasih liat foto form lu buat gue cek!' };

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
  const [attachment, setAttachment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
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
      messages: [defaultMessage]
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
        // dataUrl bentuknya: "data:image/jpeg;base64,/9j/4AAQSkZJ..."
        
        // Simpan hanya base64 data dan mimeType
        const base64Data = dataUrl.split(',')[1];
        setAttachment({
          mimeType: 'image/jpeg',
          data: base64Data,
          previewUrl: dataUrl
        });
        
        // Reset file input agar bisa upload file yang sama lagi jika dihapus
        if(fileInputRef.current) fileInputRef.current.value = "";
      };
    };
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || isLoading) return;

    const userMessageText = input.trim();
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

    const newMessageObj = { role: 'user', text: userMessageText };
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
            Calis-AI
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
            <h1 className="text-xl font-headline font-extrabold text-primary">Calis-AI</h1>
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
        <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full p-4 md:p-6 gap-4 relative">
          
          {/* Chat Box */}
          <div className="flex-1 overflow-y-auto bg-surface rounded-3xl p-5 shadow-sm border border-surface-variant flex flex-col gap-4 scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-3xl px-6 py-3 shadow-sm ${msg.role === 'user' ? 'bg-primary text-on-primary rounded-br-sm' : 'bg-surface-container text-on-surface rounded-bl-sm border border-surface-variant'}`}>
                  
                  {/* Jika pesan memiliki gambar */}
                  {msg.image && (
                    <img 
                      src={`data:${msg.image.mimeType};base64,${msg.image.data}`} 
                      alt="Uploaded visual" 
                      className="max-w-full rounded-xl mb-3 max-h-64 object-cover border border-primary-container/20"
                    />
                  )}

                  {msg.role === 'user' ? (
                    msg.text && <p className="font-medium text-white">{msg.text}</p>
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
                  <span className="font-medium text-sm">Menganalisis...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="shrink-0 flex flex-col gap-2 relative">
            
            {/* Image Preview Overlay */}
            {attachment && (
              <div className="relative inline-block w-max">
                <img 
                  src={attachment.previewUrl} 
                  alt="Preview" 
                  className="h-24 w-24 object-cover rounded-xl border-2 border-primary shadow-sm"
                />
                <button 
                  onClick={removeAttachment}
                  className="absolute -top-2 -right-2 bg-error text-white rounded-full p-1 shadow-md hover:scale-110 transition"
                  title="Remove image"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-3 items-end w-full">
              
              <input 
                type="file" 
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden" 
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="bg-surface border border-surface-variant text-on-surface-variant hover:bg-surface-variant hover:text-primary h-14 w-14 rounded-full transition shadow-sm shrink-0 flex items-center justify-center"
                title="Attach Image"
              >
                <span className="material-symbols-outlined">attach_file</span>
              </button>

              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="Tanya soal form pull-up, kirim foto alat..." 
                className="flex-1 bg-surface border border-surface-variant text-on-surface rounded-full px-6 py-4 font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition shadow-sm"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={isLoading || (!input.trim() && !attachment)}
                className="bg-primary hover:bg-primary-container hover:text-on-primary-container text-on-primary font-bold w-14 h-14 rounded-full transition disabled:opacity-50 flex items-center justify-center shadow-md shrink-0"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
