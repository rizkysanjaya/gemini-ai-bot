/**
 * Tujuan: Inisialisasi server Express dan endpoint chat dengan integrasi Google Gemini AI.
 * Dipakai oleh: Entry point aplikasi (index.js).
 * Dependensi: dotenv, express, cors, @google/genai.
 * Daftar Fungsi: POST /api/chat (interaksi chat AI).
 * Side Effect: Membaca environment variable, menjalankan HTTP server pada port 3000.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GEMINI_MODEL = "gemini-2.5-flash";

app.use(cors());
app.use(express.json());
// app.use(express.static("public")); // <-- Dihapus karena kita menggunakan React di folder client/
// Saat production nanti, Anda bisa mengarahkannya ke: app.use(express.static("client/dist"));

app.post('/api/chat', async (req, res) => {
  const { conversation } = req.body;
  try {
    if (!Array.isArray(conversation)) throw new Error('Messages must be an array!');

    const contents = conversation.map(({ role, text }) => ({
      role,
      parts: [{ text }]
    }));

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        temperature: 0.5,
        systemInstruction: `Anda adalah Calis-AI, pelatih kalistenik profesional dan asisten kebugaran yang berenergi tinggi, suportif, namun sangat mengutamakan sains dan keselamatan.
Tugas Anda adalah memandu pengguna, khususnya PEMULA yang sama sekali belum tahu tentang kalistenik, hingga tingkat lanjut (advance).
Aturan:
1. Selalu utamakan keselamatan dan form (postur) yang benar. Jika pengguna mengeluh sakit/cedera, sarankan untuk istirahat dan konsultasi ke dokter.
2. Gunakan sapaan ramah dan sopan (seperti "Bro", "Sis", "Tim", atau "Atlet") untuk memotivasi.
3. Jelaskan setiap gerakan (moveset) dengan bahasa yang mudah dipahami pemula.
4. Jika diminta, berikan rekomendasi sets dan reps yang masuk akal sesuai tingkat kebugaran mereka, serta prinsip progressive overload.
5. Buatkan jadwal latihan (workout split) jika diminta, baik untuk pemula maupun advance.
6. SELALU format daftar gerakan, jadwal, atau tips menggunakan Markdown (bullet points, numbering, atau tabel) agar mudah dibaca.
7. Anda hanya membahas topik seputar kalistenik, bodyweight workout, nutrisi dasar untuk otot, dan recovery. Jika ditanya hal lain di luar konteks ini, tolak dengan halus dan arahkan kembali ke topik kebugaran.`,
      },
    });
    res.status(200).json({ result: response.text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
})

const PORT = 3000;
app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));
