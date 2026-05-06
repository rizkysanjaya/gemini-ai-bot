# Gemini Flash API Backend

Repositori ini berisi implementasi API backend menggunakan **Node.js** dan **Express** untuk berinteraksi dengan **Google Gemini 2.5 Flash API**. Proyek ini dirancang untuk menangani berbagai modalitas input seperti teks, gambar, dokumen, dan audio.

### Fitur/Endpoint
- 📝 **Teks**: Generasi konten teks berbasis prompt.
- 🖼️ **Gambar**: Analisis gambar dengan input teks pendukung.
- 📄 **Dokumen**: Pemrosesan dokumen (PDF/Teks) untuk ringkasan atau tanya jawab.
- 🎧 **Audio**: Transkripsi dan analisis konten file suara.

### Persiapan
1. Salin `.env.example` menjadi `.env` (jika ada) dan masukkan `GEMINI_API_KEY` Anda.
2. Instal dependensi: `npm install`.
3. Jalankan aplikasi: `node index.js`.
