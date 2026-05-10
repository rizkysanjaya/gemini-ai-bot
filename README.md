# Calis-AI: Your Personal Calisthenics Trainer 🏋️‍♂️🤖

![Calis-AI Banner](https://img.shields.io/badge/Calis--AI-Trainer-006972?style=for-the-badge&logo=android)
![Tech Stack: React + Vite](https://img.shields.io/badge/React_Vite-Frontend-61DAFB?style=flat-square&logo=react&logoColor=black)
![Tech Stack: Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Tech Stack: Gemini 2.5 Flash](https://img.shields.io/badge/Gemini_2.5_Flash-AI-4285F4?style=flat-square&logo=google)

**Calis-AI** adalah asisten virtual interaktif dan asisten kebugaran spesialis **Kalistenik** (Olahraga beban tubuh). Dibangun menggunakan arsitektur *Full-stack* (React & Express) dan ditenagai langsung oleh kecerdasan buatan dari **Google Gemini 2.5 Flash**, aplikasi ini mampu memberikan jadwal latihan, menjawab teori otot, hingga melakukan **analisis visual (multimodal)** terhadap postur atau *form* olahraga Anda melalui fitur unggah gambar.

---

## 🎯 Target Pengguna
Aplikasi ini dirancang khusus untuk:
1. **Pemula Mutlak (Beginners)**: Mereka yang belum pernah berolahraga dan bingung harus mulai dari mana. Calis-AI dapat menyusun program langkah-demi-langkah dari nol (seperti *wall push-up*, *dead hang*).
2. **Atlet Menengah (Intermediate)**: Praktisi kalistenik yang sudah berlatih namun mengalami hambatan (*plateau*) atau ingin memverifikasi keamanan teknik gerakan mereka (misal: mengevaluasi postur *pull-up* yang benar).
3. **Fitness Enthusiast Umum**: Siapa saja yang menginginkan *Personal Trainer* 24/7 yang responsif, cerdas, dan gratis di saku mereka.

---

## 💡 Manfaat Utama
- **Mencegah Cedera (Injury Prevention)**: Melalui fitur *Image Upload*, pengguna bisa memotret posisi *plank* atau *push-up* mereka dan AI akan mengevaluasi apakah punggung mereka sudah lurus atau belum.
- **Efisiensi Waktu & Biaya**: Mendapatkan bimbingan kalistenik personal tanpa harus membayar langganan pelatih fisik di pusat kebugaran (*gym*).
- **Aksesibilitas Tanpa Batas**: Mengingat kalistenik bisa dilakukan di mana saja (di rumah atau taman), memiliki panduan AI *on-the-go* membuat rutinitas olahraga tidak pernah terputus.
- **Kenyamanan Privasi**: Sistem menggunakan memori *Local Storage*, sehingga riwayat latihan dan foto form pengguna aman tersimpan di dalam *browser* perangkat mereka sendiri.

---

## 🛠️ Tech Stack (Teknologi yang Digunakan)

**Frontend:**
- **React.js** (via Vite): *Framework* UI untuk performa super cepat.
- **Tailwind CSS v4**: *Styling engine* untuk membangun UI modern, responsif, bergaya *dark mode input*, dan skema warna *Deep Teal/Cyan*.
- **React-Markdown**: Untuk merender keluaran AI dengan format yang rapi (tebal, *bullet point*, struktur bersarang).
- **Canvas API**: Digunakan di sisi *client* untuk mengompres (*resize* & ubah ke JPEG) gambar yang diunggah secara *on-the-fly* untuk menghemat memori.

**Backend:**
- **Node.js & Express.js**: Server API berkinerja tinggi untuk menjembatani Frontend dan Model AI.
- **@google/genai**: SDK resmi terbaru dari Google untuk menghubungkan sistem dengan model **gemini-2.5-flash**.
- **Cors & Dotenv**: Manajemen keamanan lintas-domain dan konfigurasi *environment variables*.

---

## 🚀 Cara Instalasi & Menjalankan Proyek (Local Development)

Ikuti langkah-langkah di bawah ini untuk menjalankan **Calis-AI** di komputer Anda.

### 1. Prasyarat (*Prerequisites*)
- Pastikan **Node.js** (versi 18+) sudah terinstal di perangkat Anda.
- Miliki kunci API dari **Google Gemini Studio** (*Gemini API Key*).

### 2. Konfigurasi Backend (Express)
1. *Clone* repositori ini dan masuk ke folder proyek utama:
   ```bash
   git clone https://github.com/username/calis-ai-bot.git
   cd calis-ai-bot
   ```
2. Instal semua dependensi server:
   ```bash
   npm install
   ```
3. Buat file `.env` di dalam folder *root* proyek ini, lalu masukkan API Key Anda:
   ```env
   GEMINI_API_KEY=isi_dengan_api_key_gemini_anda_di_sini
   ```
4. Jalankan server Backend:
   ```bash
   node --watch index.js
   ```
   *(Server akan berjalan dan memberikan pesan: "Server jalan di port 3000 bro!")*

### 3. Konfigurasi Frontend (React + Vite)
1. Buka terminal baru dan masuk ke direktori `client`:
   ```bash
   cd client
   ```
2. Instal dependensi Frontend:
   ```bash
   npm install
   ```
3. Jalankan server pengembangan *Vite*:
   ```bash
   npm run dev
   ```
4. Buka peramban (*browser*) Anda dan kunjungi URL yang diberikan Vite (umumnya `http://localhost:5173`).

🎉 **Selesai!** Calis-AI siap memandu rutinitas kalistenik Anda. Silakan mulai obrolan, unggah gambar postur Anda, atau klik *Default Prompts* untuk mencoba!

---
*Dikembangkan sebagai Final Project - Hacktiv8 AI*
