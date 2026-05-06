/**
 * index.js
 * 
 * Tujuan: Entry point aplikasi backend untuk integrasi Google Gemini Flash API.
 * Dipakai oleh: Node.js runtime (backend service).
 * Dependensi utama: express, multer, @google/genai, dotenv.
 * Daftar fungsi utama: Inisialisasi server Express, konfigurasi Multer, setup Google GenAI client.
 * Side effect: Menjalankan server HTTP pada port 3000, membaca variabel lingkungan dari .env.
 */

import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';

const app = express();

const upload = multer();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


const GEMINI_MODEL = 'gemini-2.5-flash-lite';

app.use(express.json());
// TODO: Implementasi endpoint generate-text untuk integrasi dengan Google Gemini Flash API
app.post('/generate-text', async (req, res) =>{


    const prompt = req.body.prompt || "Apa yang bisa dilakukan oleh AI?";

    try{
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
        });
        
        res.status(200).json({ result: response.text });
    }catch(error){
        console.error(error);
        res.status(500).json({ 'error': error.message });
    }
})

// TODO: Implementasi endpoint generate-image untuk integrasi dengan Google Gemini Flash API
app.post('/generate-from-image', upload.single('image'), 
async ( req,res) => {
    try {
        const { prompt } = req.body;

        //cek dulu file ada atau tidak
        if (!req.file) {
            return res.status(400).json({ message: "No image file uploaded. Please upload an image using the 'image' field." });
        }

        const base64Image = req.file.buffer.toString('base64')

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { text: prompt || "Deskripsikan gambar ini", type: "text" },
                { inlineData: { data: base64Image, mimeType: req.file.mimetype } }
            ]
        })

        res.status(200).json({ result: response.text })
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: e.message })
    }
})

// TODO: Implementasi endpoint generate-from-document untuk integrasi dengan Google Gemini Flash API
app.post('/generate-from-document', upload.single('document')
, async (req, res) => {
    const { prompt } = req.body;
    const base64Document = req.file.buffer.toString('base64')

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { 
                    text: prompt ?? "Tolong buat ringkasan dokumen berikut", 
                    type: "text" 
                },
                { 
                    inlineData: { 
                        data: base64Document, 
                        mimeType: req.file.mimetype 
                    } 
                }
            ]
        })
        
        res.status(200).json({ result: response.text })
    } catch (e) {
        console.log(e);
        res.status(500).json({message: e.message})
    }
})



// TODO: Implementasi endpoint generate-from-audio untuk integrasi dengan Google Gemini Flash API
app.post('/generate-from-audio', upload.single('audio')
, async (req, res) => {
    const { prompt } = req.body;
    const base64Audio = req.file.buffer.toString('base64')

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { 
                    text: prompt ?? "Tolong buat transkrip audio berikut", 
                    type: "text" 
                },
                { 
                    inlineData: { 
                        data: base64Audio, 
                        mimeType: req.file.mimetype 
                    } 
                }
            ]
        })
        
        res.status(200).json({ result: response.text })
    } catch (e) {
        console.log(e);
        res.status(500).json({message: e.message})
    }
})

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
