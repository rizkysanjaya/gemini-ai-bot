/**
 * Tujuan: Komponen utama (Aplikasi Chatbot) untuk Calis-AI.
 * Dipakai oleh: src/main.jsx.
 * Dependensi: react, react-markdown.
 * Daftar Fungsi: 
 *  - App: Mengelola state chat, input, dan request ke backend.
 * Side Effect: Membaca/menulis localStorage, HTTP POST ke /api/chat.
 */

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

function App() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('calis-ai-chat');
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      { role: 'model', text: 'Halo Bro! Gue Calis-AI, pelatih kalistenik lu. Mau mulai dari mana hari ini? Tanya aja soal form, jadwal pemula, atau rekomendasi reps/sets!' }
    ];
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('calis-ai-chat', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', text: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    // Limit context length (send last 15 messages)
    const contextToSend = newMessages.slice(-15);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation: contextToSend }),
      });

      const data = await response.json();
      if (response.ok && data.result) {
        setMessages((prev) => [...prev, { role: 'model', text: data.result }]);
      } else {
        setMessages((prev) => [...prev, { role: 'model', text: 'Sori bro, lagi ada gangguan server. Coba lagi bentar ya.' }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'model', text: 'Koneksi gagal bro, cek internet lu.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if(confirm('Yakin mau hapus semua riwayat latihan?')) {
      setMessages([{ role: 'model', text: 'Halo Bro! Gue Calis-AI, pelatih kalistenik lu. Mau mulai dari mana hari ini?' }]);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4 md:p-6 font-sans">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-green-400">Calis-AI</h1>
          <p className="text-gray-400 text-sm">Pelatih Kalistenik Pribadi Lu</p>
        </div>
        <button onClick={handleClear} className="text-sm text-red-400 hover:text-red-300 transition">Reset Chat</button>
      </header>

      <div className="flex-1 overflow-y-auto bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700 mb-4 flex flex-col gap-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-green-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
              {msg.role === 'user' ? (
                <p>{msg.text}</p>
              ) : (
                <div className="prose prose-invert prose-green max-w-none prose-sm sm:prose-base [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-400 rounded-2xl p-4 rounded-bl-none animate-pulse">
              Calis-AI mikir jadwal lu...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="Tanya soal otot, gerakan, atau jadwal..." 
          className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 transition"
          disabled={isLoading}
        />
        <button 
          type="submit" 
          disabled={isLoading || !input.trim()}
          className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition disabled:opacity-50"
        >
          Kirim
        </button>
      </form>
    </div>
  );
}

export default App;
