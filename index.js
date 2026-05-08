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
app.use(express.static("public"));

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
        temperature: 0.9,
        systemInstruction: "Jawab hanya menggunakan bahasa Indonesia.",
      },
    });
    res.status(200).json({ result: response.text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
})

const PORT = 3000;
app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));
