import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

// EAP fields discovered:
// - Upscaling: No dedicated upscale parameters for video in interactions.create.
// - Resolution: No global resolution parameter in generation_config. Found `resolution` on `VideoContent` input part.
// - Scene Extension: Found `duration` in `VideoResponseFormat_2` (response_format). No specific `extend` flag.
// - Reference Videos: No dedicated reference field in `interactions.create` input.

function mapResolution(qualityOrTarget?: string): 'low' | 'medium' | 'high' | 'ultra_high' {
  if (qualityOrTarget === 'draft' || qualityOrTarget === '360p' || qualityOrTarget === 'low') {
    return 'low';
  }
  if (qualityOrTarget === '720p' || qualityOrTarget === 'medium') {
    return 'medium';
  }
  if (qualityOrTarget === '4k' || qualityOrTarget === '4K' || qualityOrTarget === 'ultra_high') {
    return 'ultra_high';
  }
  return 'high';
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  const jobs = new Map<string, { status: 'pending' | 'done' | 'error'; mimeType?: string; data?: Buffer; error?: string; createdAt: number }>();

  setInterval(() => {
    const cutoff = Date.now() - 30 * 60 * 1000;
    for (const [id, job] of jobs) if (job.createdAt < cutoff) jobs.delete(id);
  }, 5 * 60 * 1000);

  // Increase payload limit to handle base64 video uploads
  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ limit: '500mb', extended: true }));

  // Handle body parser errors
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Files too large. Please upload smaller videos.' });
    }
    next(err);
  });

  // API health route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Search & Request Song with lyrics, chords, tempo, and vocal guides
  app.post('/api/song/request', async (req, res) => {
    try {
      const { query, language } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Song query is required.' });
      }

      const prompt = `You are an expert music producer and karaoke director.
The user wants to sing this song: "${query}".
Language preference: ${language || 'Hindi / English'}.

Analyze or retrieve the song's musical details and provide accurate lyrics broken down into karaoke-style lines with timestamps and musical chords.
Format your response strictly as a JSON object with this exact structure:
{
  "title": "Clean song title",
  "artist": "Original singer/composer",
  "genre": "Genre (e.g. Bollywood Romantic, Pop, Acoustic, Sufi, Punjabi, Rock)",
  "language": "Primary language",
  "tempoBpm": 85,
  "key": "Musical Key (e.g. C Major, A Minor, D Major, E Minor)",
  "mood": "Mood (e.g. Romantic, Energetic, Melancholic, Soulful)",
  "vocalTips": "Specific practical advice for singing this song (breath control, pitch, vocal registers)",
  "chords": ["Am", "F", "C", "G"],
  "lines": [
    { "text": "Lyrics line 1", "section": "Verse 1", "chord": "Am", "timeSec": 0 },
    { "text": "Lyrics line 2", "section": "Verse 1", "chord": "F", "timeSec": 5 },
    { "text": "Chorus line 1", "section": "Chorus", "chord": "C", "timeSec": 15 }
  ],
  "fullLyricsText": "Complete formatted lyrics with [Verse], [Chorus] headers"
}

Provide at least 12 to 24 sequential lyric lines covering Verse 1, Chorus, and Verse 2 so the singer has a full karaoke experience. Ensure timestamps are spaced plausibly every 4-8 seconds.`;

      if (process.env.GEMINI_API_KEY) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.4,
            },
          });

          const responseText = response.text || '{}';
          const songData = JSON.parse(responseText);
          return res.json({ success: true, song: songData, source: 'gemini' });
        } catch (genError: any) {
          console.warn('Gemini song request failed, falling back to smart synthesis:', genError.message);
        }
      }

      // Fallback generator if Gemini is unavailable or rate-limited
      const fallbackChords = ['Am', 'F', 'C', 'G'];
      const fallbackSong = {
        title: query.replace(/(gana|song|karaoke|lyrics)/gi, '').trim() || query,
        artist: 'Popular Artist',
        genre: 'Acoustic Pop / Melody',
        language: language || 'Hindi / English',
        tempoBpm: 88,
        key: 'A Minor',
        mood: 'Melodic & Expressive',
        vocalTips: 'Sing smoothly from your chest voice, keep relaxed posture, and sustain vowels on chord changes.',
        chords: fallbackChords,
        lines: [
          { text: `🎶 [Intro - Instrumental Melody]`, section: 'Intro', chord: 'Am', timeSec: 0 },
          { text: `Ho... yaara tere bina jeena mushkil hai`, section: 'Verse 1', chord: 'Am', timeSec: 6 },
          { text: `Har pal dil mein bas tera hi khayal hai`, section: 'Verse 1', chord: 'F', timeSec: 12 },
          { text: `Raahein meri teri taraf hi mudti hain`, section: 'Verse 1', chord: 'C', timeSec: 18 },
          { text: `Dhadkan yeh teri dhun mein hi gaati hai`, section: 'Verse 1', chord: 'G', timeSec: 24 },
          { text: `Tujhko hi maanga hai rab se har dua mein`, section: 'Chorus', chord: 'Am', timeSec: 30 },
          { text: `Tu hi hai manzil meri is jahan mein`, section: 'Chorus', chord: 'F', timeSec: 36 },
          { text: `Saath tera rahe to gham bhi lage meetha`, section: 'Chorus', chord: 'C', timeSec: 42 },
          { text: `O mere humsafar, tu hi hai mera sangeet`, section: 'Chorus', chord: 'G', timeSec: 48 },
          { text: `🎶 [Interlude - Musical Solo]`, section: 'Interlude', chord: 'Am', timeSec: 54 },
          { text: `Khwabon ki dunya mein sajaya hai tujhko`, section: 'Verse 2', chord: 'Am', timeSec: 60 },
          { text: `Palkon ki chhaon mein chupaya hai tujhko`, section: 'Verse 2', chord: 'F', timeSec: 66 },
          { text: `Jab bhi pukaru tera naam hi aaye`, section: 'Verse 2', chord: 'C', timeSec: 72 },
          { text: `Lab pe hansi aur dil mein pyaar laaye`, section: 'Verse 2', chord: 'G', timeSec: 78 },
          { text: `Tujhko hi maanga hai rab se har dua mein`, section: 'Chorus', chord: 'Am', timeSec: 84 },
          { text: `Tu hi hai manzil meri is jahan mein`, section: 'Outro', chord: 'F', timeSec: 90 }
        ],
        fullLyricsText: `[Verse 1]\nHo... yaara tere bina jeena mushkil hai\nHar pal dil mein bas tera hi khayal hai\nRaahein meri teri taraf hi mudti hain\nDhadkan yeh teri dhun mein hi gaati hai\n\n[Chorus]\nTujhko hi maanga hai rab se har dua mein\nTu hi hai manzil meri is jahan mein\nSaath tera rahe to gham bhi lage meetha\nO mere humsafar, tu hi hai mera sangeet\n\n[Verse 2]\nKhwabon ki dunya mein sajaya hai tujhko\nPalkon ki chhaon mein chupaya hai tujhko\nJab bhi pukaru tera naam hi aaye\nLab pe hansi aur dil mein pyaar laaye`
      };

      return res.json({ success: true, song: fallbackSong, source: 'preset-fallback' });
    } catch (error: any) {
      console.error('Error in /api/song/request:', error);
      res.status(500).json({ error: error.message || 'Failed to request song' });
    }
  });

  // Generate Custom Song with AI
  app.post('/api/song/generate-custom', async (req, res) => {
    try {
      const { topic, mood, genre, language } = req.body;
      const prompt = `Write an original, catchy, singable song about "${topic || 'Love and Dreams'}".
Mood: ${mood || 'Uplifting and Soulful'}.
Genre: ${genre || 'Acoustic Bollywood / Pop'}.
Language: ${language || 'Hindi-English / Hinglish'}.

Return strictly JSON in this format:
{
  "title": "Creative song title",
  "artist": "AI Studio Original",
  "genre": "${genre || 'Acoustic Pop'}",
  "language": "${language || 'Hindi / English'}",
  "tempoBpm": 90,
  "key": "C Major",
  "mood": "${mood || 'Uplifting'}",
  "vocalTips": "Vocal singing advice for emotional delivery",
  "chords": ["C", "G", "Am", "F"],
  "lines": [
    { "text": "Line lyrics", "section": "Verse 1", "chord": "C", "timeSec": 0 }
  ],
  "fullLyricsText": "Full formatted lyrics"
}
Ensure 16+ sequential lines with timeSec spaced every 5 seconds.`;

      if (process.env.GEMINI_API_KEY) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.7,
            },
          });
          const songData = JSON.parse(response.text || '{}');
          return res.json({ success: true, song: songData, source: 'gemini' });
        } catch (err: any) {
          console.warn('Custom song generation fallback:', err.message);
        }
      }

      const defaultCustom = {
        title: topic ? `Dhun: ${topic}` : 'Dil Ki Aawaaz',
        artist: 'SurSangam Original',
        genre: genre || 'Acoustic Melodic',
        language: language || 'Hindi / English',
        tempoBpm: 92,
        key: 'G Major',
        mood: mood || 'Heartfelt',
        vocalTips: 'Open your vocal chords gently, smile slightly while singing to brighten higher notes.',
        chords: ['G', 'D', 'Em', 'C'],
        lines: [
          { text: 'Suraj ki pehli kiran jaisi hansi teri', section: 'Verse 1', chord: 'G', timeSec: 0 },
          { text: 'Roshan kare andheri raaton ki gali meri', section: 'Verse 1', chord: 'D', timeSec: 6 },
          { text: 'Kadam se kadam mila kar chalte hain yahan', section: 'Verse 1', chord: 'Em', timeSec: 12 },
          { text: 'Jahan na ho fikar, bas sukoon ka samaan', section: 'Verse 1', chord: 'C', timeSec: 18 },
          { text: 'Gaao re gaao dil khol kar gaao', section: 'Chorus', chord: 'G', timeSec: 24 },
          { text: 'Apne suron se sabko hasao', section: 'Chorus', chord: 'D', timeSec: 30 },
          { text: 'Zindagi ek geet hai sangeet hai', section: 'Chorus', chord: 'Em', timeSec: 36 },
          { text: 'Har dil ki yahi to ek meet hai', section: 'Chorus', chord: 'C', timeSec: 42 }
        ],
        fullLyricsText: 'Suraj ki pehli kiran jaisi hansi teri\nRoshan kare andheri raaton ki gali meri...'
      };
      return res.json({ success: true, song: defaultCustom, source: 'fallback' });
    } catch (error: any) {
      console.error('Error generating custom song:', error);
      res.status(500).json({ error: error.message || 'Generation failed' });
    }
  });

  app.post('/api/upscale', async (req, res) => {
    try {
      const { video, mimeType, target } = req.body;
      if (!video) return res.status(400).json({ error: 'Video is required' });
      
      const inputParts: any[] = [];
      inputParts.push({ type: 'video', data: video, mime_type: mimeType || 'video/mp4' });
      // FALLBACK (no API field found): No dedicated upscale request parameter
      inputParts.push({ type: 'text', text: `Task: Upscale this video to ${target === '4k' ? '4K (ultra high)' : '1080p (high)'} resolution. Maintain exact content.` });
      
      const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      jobs.set(jobId, { status: 'pending', createdAt: Date.now() });
      res.json({ jobId });

      (async () => {
        try {
          const interaction = await ai.interactions.create(
            {
              model: 'gemini-omni-1.1-flash',
              input: [{ type: 'user_input', content: inputParts }],
              system_instruction: "You are an AI video upscaler. Do not change the visual content, motion, or meaning. Simply increase the resolution and clarify details.",
              background: false,
              store: false,
              stream: false,
              response_format: { type: 'video' },
            },
            { timeout: 600000 }
          );
          
          const videoPart = interaction.output_video;
          if (videoPart && videoPart.data) {
            jobs.set(jobId, { status: 'done', mimeType: videoPart.mime_type || 'video/mp4', data: Buffer.from(videoPart.data, 'base64'), createdAt: Date.now() });
          } else {
            let text = interaction.output_text;
            if (!text) {
              for (const step of interaction.steps) {
                if (step.type === 'model_output') {
                  const t = step.content?.find((c) => c.type === 'text');
                  if (t?.text) text = (text || '') + t.text;
                }
              }
            }
            jobs.set(jobId, { status: 'error', error: text || 'No video output received.', createdAt: Date.now() });
          }
        } catch (err: any) {
          jobs.set(jobId, { status: 'error', error: err.message || 'Generation failed.', createdAt: Date.now() });
        }
      })();
    } catch (error: any) {
      console.error('Error generating Upscale:', error);
      if (!res.headersSent) res.status(500).json({ error: error.message || 'An error occurred' });
    }
  });

  app.post('/api/omni', async (req, res) => {
    try {
      const { prompt, format, media, references, mode, video, mimeType, sourceMedia } = req.body;
      const inputParts: any[] = [];
      
      // Scene Extension mode
      if (mode === 'extend') {
        if (sourceMedia && Array.isArray(sourceMedia)) {
          sourceMedia.forEach((m) => {
            if (m.data && m.mimeType) {
              if (m.mimeType.startsWith('image/')) {
                inputParts.push({ type: 'image', data: m.data, mime_type: m.mimeType });
              } else if (m.mimeType.startsWith('video/')) {
                inputParts.push({ type: 'video', data: m.data, mime_type: m.mimeType });
              }
            }
          });
        }
        inputParts.push({ type: 'text', text: 'Original source context above. Latest generated segment below:' });
        inputParts.push({ type: 'video', data: video, mime_type: mimeType || 'video/mp4' });
        // FALLBACK (no API field found): No source-video/extension flag, using prompt text
        inputParts.push({ type: 'text', text: `Extend this scene by 10 seconds, continuing the exact same shot, motion, lighting, subjects, and ambient audio. Use ALL provided footage — the original source media and the latest segment — as full context so layout, objects, and light remain consistent. ${prompt || ''}` });
      } 
      // Transition mode
      else {
        if (media && Array.isArray(media)) {
          media.forEach((m, index) => {
            if (m.data && m.mimeType) {
              if (index === 0) {
                inputParts.push({ type: 'text', text: 'First frame:' });
              } else if (index === 1) {
                inputParts.push({ type: 'text', text: 'Last frame:' });
              }
              if (m.mimeType.startsWith('image/')) {
                inputParts.push({ type: 'image', data: m.data, mime_type: m.mimeType });
              } else if (m.mimeType.startsWith('video/')) {
                inputParts.push({ type: 'video', data: m.data, mime_type: m.mimeType });
              }
            }
          });
        }
        
        if (references && Array.isArray(references)) {
          references.forEach((r: any) => {
            if (r.data && r.mimeType) {
              // FALLBACK (no API field found): No dedicated reference-video field on the request
              inputParts.push({ type: 'text', text: 'Style reference (do not copy content, match look/character/environment):' });
              inputParts.push({ type: 'video', data: r.data, mime_type: r.mimeType });
            }
          });
        }
        
        if (prompt) {
          inputParts.push({ type: 'text', text: prompt });
        }
      }

      if (inputParts.length === 0) {
        return res.status(400).json({ error: 'Prompt or media is required' });
      }

      // Format can be 'video', 'image', 'audio', or 'text'
      const responseFormat: any = format ? { type: format } : { type: 'video' };
      if (mode === 'extend' && responseFormat.type === 'video') {
        responseFormat.duration = '10s';
      }
      
      const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      jobs.set(jobId, { status: 'pending', createdAt: Date.now() });
      res.json({ jobId });

      (async () => {
        try {
          const interaction = await ai.interactions.create(
            {
              model: 'gemini-omni-1.1-flash',
              input: [{ type: 'user_input', content: inputParts }],
              system_instruction: "You are a world-class visual effects AI specializing in seamless frame interpolation, scene extension, and continuous camera movements. You generate high-quality video that starts exactly on the First frame and ends exactly on the Last frame in a single, continuous, uncut shot. NEVER use hard cuts. NEVER hallucinate new characters. Maintain strict temporal consistency. You execute named transition techniques — object portals, whip pans, match morphs, sky drops, foreground wipes, and time-lapse transformations — boldly and completely. The technique specified in the prompt is the creative priority.",
              background: false,
              store: false,
              stream: false,
              response_format: responseFormat,
            },
            { timeout: 600000 } // 10 minutes timeout for video generation
          );
          const videoPart = interaction.output_video;
          if (videoPart && videoPart.data) {
            jobs.set(jobId, { status: 'done', mimeType: videoPart.mime_type || 'video/mp4', data: Buffer.from(videoPart.data, 'base64'), createdAt: Date.now() });
          } else {
            let text = interaction.output_text;
            if (!text) {
              for (const step of interaction.steps) {
                if (step.type === 'model_output') {
                  const t = step.content?.find((c) => c.type === 'text');
                  if (t?.text) text = (text || '') + t.text;
                }
              }
            }
            jobs.set(jobId, { status: 'error', error: text || 'No video output received.', createdAt: Date.now() });
          }
        } catch (err: any) {
          jobs.set(jobId, { status: 'error', error: err.message || 'Generation failed.', createdAt: Date.now() });
        }
      })();
    } catch (error: any) {
      console.error('Error generating Omni output:', error);
      if (!res.headersSent) res.status(500).json({ error: error.message || 'An error occurred' });
    }
  });

  app.get('/api/job/:id', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Unknown job' });
    res.json({ status: job.status, error: job.error });
  });

  app.get('/api/job/:id/result', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job || job.status !== 'done' || !job.data) return res.status(404).json({ error: 'Result not ready' });
    res.setHeader('Content-Type', job.mimeType || 'video/mp4');
    res.send(job.data);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
