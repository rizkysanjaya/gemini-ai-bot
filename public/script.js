/**
 * Tujuan: Mengelola interaksi UI chatbot di sisi client (frontend).
 * Dipakai oleh: public/index.html.
 * Dependensi: None (Vanilla JS).
 * Daftar Fungsi: 
 *   - appendMessage: Menambahkan elemen pesan ke chat box.
 *   - submit event listener: Mengirim data ke API dan mengelola state UI.
 * Side Effect: Manipulasi DOM pada #chat-box, HTTP POST call ke /api/chat.
 */

const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

// Menyimpan riwayat percakapan untuk konteks AI (Gemini)
let conversationHistory = [];

/**
 * Menambahkan pesan ke dalam kotak chat.
 * @param {string} sender - 'user' atau 'bot' (sesuai class CSS di style.css)
 * @param {string} text - Isi teks pesan
 * @returns {HTMLElement} - Mengembalikan element pesan untuk update konten secara dinamis
 */
function appendMessage(sender, text) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', sender);
  messageDiv.textContent = text;
  
  chatBox.appendChild(messageDiv);
  
  // Karena style.css menggunakan float, kita butuh elemen pembersih agar layout tidak berantakan
  const clearDiv = document.createElement('div');
  clearDiv.style.clear = 'both';
  chatBox.appendChild(clearDiv);
  
  // Gulir otomatis ke pesan terbaru
  chatBox.scrollTop = chatBox.scrollHeight;
  
  return messageDiv;
}

// Menangani pengiriman form chat
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const text = userInput.value.trim();
  if (!text) return;

  // 1. Tampilkan pesan pengguna di UI
  appendMessage('user', text);
  
  // 2. Simpan pesan pengguna ke dalam riwayat percakapan
  conversationHistory.push({ role: 'user', text: text });
  
  // Bersihkan input
  userInput.value = '';

  // 3. Tampilkan pesan sementara "Thinking..." dari bot
  const botMessageElement = appendMessage('bot', 'Thinking...');

  try {
    // 4. Lakukan request POST ke backend /api/chat
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ conversation: conversationHistory })
    });

    const data = await response.json();

    if (response.ok && data.result) {
      // 5. Ganti teks "Thinking..." dengan jawaban asli dari AI
      botMessageElement.textContent = data.result;
      
      // 6. Simpan jawaban AI ke riwayat (role: 'model' sesuai spek Gemini)
      conversationHistory.push({ role: 'model', text: data.result });
    } else {
      // Menangani kasus jika server mengembalikan error atau tidak ada result
      botMessageElement.textContent = 'Sorry, no response received.';
      console.warn('Backend Error:', data);
    }
  } catch (error) {
    // Menangani error jaringan atau kegagalan fetch
    console.error('Fetch Error:', error);
    botMessageElement.textContent = 'Failed to get response from server.';
  } finally {
    // Pastikan scroll tetap di bawah setelah update konten
    chatBox.scrollTop = chatBox.scrollHeight;
  }
});
