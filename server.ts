import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

// Helper to get Gemini client
function getGenAIClient(byokKey?: string): { client: GoogleGenAI; isByok: boolean } {
  if (byokKey && byokKey.trim().length > 10) {
    return { client: new GoogleGenAI({ apiKey: byokKey.trim() }), isByok: true };
  }
  const serverKey = process.env.GEMINI_API_KEY;
  if (!serverKey) {
    throw new Error('No Gemini API key available. Please configure GEMINI_API_KEY or provide your own key.');
  }
  return { client: new GoogleGenAI({ apiKey: serverKey }), isByok: false };
}

// 1. API: AI Health / Status
app.get('/api/ai/status', (req, res) => {
  const hasServerKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
  res.json({
    status: 'ok',
    builtInAvailable: hasServerKey,
    supportedModel: 'gemini-3.8-flash',
    features: [
      'journal_analysis',
      'loss_review',
      'win_review',
      'multimodal_screenshots',
      'pattern_detection',
      'voice_tts',
      'voice_live',
    ],
  });
});

// 2. API: Test BYOK Key
app.post('/api/ai/test-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Invalid API key format.' });
    }

    const testClient = new GoogleGenAI({ apiKey: apiKey.trim() });
    const response = await testClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Respond with the word "CONNECTED" only.',
    });

    if (response && response.text) {
      return res.json({ success: true, message: 'Gemini API connected successfully!' });
    } else {
      return res.status(400).json({ success: false, error: 'Empty response from Gemini.' });
    }
  } catch (error: any) {
    console.error('Error testing Gemini key:', error);
    return res.status(400).json({
      success: false,
      error: error?.message || 'Could not authenticate with Gemini. Please verify your API key.',
    });
  }
});

// 3. API: AI Trading Coach Text & Vision
app.post('/api/ai/coach', async (req, res) => {
  try {
    const {
      prompt,
      context,
      coachingStyle = 'balanced',
      language = 'en', // 'en', 'hi', 'bn', 'ta'
      image, // { data: string (base64 without prefix), mimeType: string }
      conversationHistory = [],
      byokKey,
    } = req.body;

    if (!prompt && !image) {
      return res.status(400).json({ error: 'Prompt or image is required.' });
    }

    const { client } = getGenAIClient(byokKey);

    // Language guidelines
    const languageDirectives: Record<string, string> = {
      en: 'Communicate fluently in English.',
      hi: 'Communicate naturally and fluently in Hindi (हिन्दी). Use clear Devanagari script for your answer. Keep trading terms (like Stop Loss, R-Multiple, Risk to Reward, Setup, Breakout) understandable in commonly used Hinglish/Devanagari trading vocabulary.',
      bn: 'Communicate naturally and fluently in Bengali (বাংলা). Use clear Bengali script for your answer. Keep key trading concepts (Stop Loss, P&L, Risk-to-Reward) clear and natural for a Bengali trader.',
      ta: 'Communicate naturally and fluently in Tamil (தமிழ்). Use clear Tamil script for your answer. Keep key trading concepts (Stop Loss, Risk-Reward, Discipline) clear and natural for a Tamil trader.',
    };

    const targetLangDirective = languageDirectives[language] || languageDirectives.en;

    // Build system instruction tailored to user's style & discipline principles
    let styleInstruction = 'Maintain a balanced, constructive, and objective professional tone.';
    if (coachingStyle === 'strict') {
      styleInstruction =
        'Be a strict, direct, and uncompromising Process & Discipline Coach. Zero tolerance for unhedged risk, FOMO, moving stop-losses, or breaking playbook rules. Be firm and process-focused, never insulting.';
    } else if (coachingStyle === 'analytical') {
      styleInstruction =
        'Adopt an analytical, statistical, quantitative hedge-fund risk officer tone. Focus heavily on R-multiples, expectancy, drawdown variance, and sample sizes.';
    } else if (coachingStyle === 'concise') {
      styleInstruction = 'Be extremely concise, brief, and punchy. Use short bullet points and get straight to the point.';
    } else if (coachingStyle === 'encouraging') {
      styleInstruction =
        'Be encouraging, empathetic, and constructive while maintaining rigorous adherence to risk management.';
    }

    const systemInstruction = `You are the AI Trading Coach inside TradePulse, a premier manual trading journal and risk analytics platform.
You are evaluating the logged-in trader's personal trading journal.
${styleInstruction}

LANGUAGE INSTRUCTION:
${targetLangDirective}
You MUST reply in the specified language so that the trader can easily read and listen via speech synthesis in their preferred language.

CORE RULES:
1. NEVER invent or fabricate statistics. Use ONLY the data provided in the journal context below.
2. When highlighting behavioral patterns (e.g. "Your third trade of the day underperforms"), cite numerical evidence from the journal context (e.g., win rates, R-multiples, sample count).
3. In Loss Reviews, always distinguish between:
   - "Good Loss": A valid setup executed according to rules with predefined stop-loss that happened to take a normal loss.
   - "Process Error": A trade where rules were broken (FOMO, late entry, oversized position, stop moved, no stop).
4. In Win Reviews, acknowledge if a winning trade had poor process or rule violations (lucky wins that reward bad habits).
5. For deep reviews of trades or performance periods, organize your response with clear markdown headers:
   ### Summary
   ### What Happened
   ### What You Did Well
   ### What Hurt Performance
   ### Pattern Detected
   ### Improvement
   ### Focus for Next Session
6. For conversational or quick questions, answer naturally and directly without forcing all headers.

CURRENT TRADER JOURNAL CONTEXT:
${JSON.stringify(context, null, 2)}
`;

    // Construct contents
    const contents: any[] = [];

    // Add prior conversation messages if any
    if (Array.isArray(conversationHistory)) {
      conversationHistory.slice(-8).forEach((msg: any) => {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content || '' }],
        });
      });
    }

    // Current turn parts
    const currentParts: any[] = [];
    if (prompt) {
      currentParts.push({ text: prompt });
    }
    if (image && image.data && image.mimeType) {
      currentParts.push({
        inlineData: {
          data: image.data,
          mimeType: image.mimeType,
        },
      });
    }

    contents.push({
      role: 'user',
      parts: currentParts,
    });

    const response = await client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.4,
      },
    });

    const text = response.text || 'Unable to generate response.';
    return res.json({ response: text });
  } catch (error: any) {
    console.error('Error generating AI coach response:', error);
    return res.status(500).json({
      error: error?.message || 'AI Coach is temporarily unavailable. Your trading data is safe.',
    });
  }
});

// 4. API: AI Speech Generation (TTS) with Gemini 3.8 Flash Lite TTS
app.post('/api/ai/tts', async (req, res) => {
  try {
    const { text, voiceName = 'Zephyr', byokKey } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for speech synthesis.' });
    }

    const { client } = getGenAIClient(byokKey);

    // Limit text to avoid payload timeouts
    const cleanText = text
      .replace(/[#*_`~>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1000);

    const validVoice = ['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'].includes(voiceName)
      ? voiceName
      : 'Zephyr';

    const response = await client.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: 'Professional, articulate trading coach',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: validVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio returned from speech synthesis.' });
    }

    return res.json({
      audio: base64Audio,
      mimeType: 'audio/wav',
      voice: validVoice,
    });
  } catch (error: any) {
    console.error('Error generating speech:', error);
    return res.status(500).json({
      error: error?.message || 'Speech generation unavailable.',
    });
  }
});

// 5. API: Audio Transcription with Gemini 3.5 Transcribe
app.post('/api/ai/transcribe', async (req, res) => {
  try {
    const { audioData, mimeType = 'audio/webm', byokKey } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required.' });
    }

    const { client } = getGenAIClient(byokKey);

    const response = await client.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              data: audioData,
              mimeType,
            },
          },
          { text: 'Transcribe this trader voice message verbatim. Return ONLY the spoken words, no explanations.' },
        ],
      },
    });

    const transcript = (response.text || '').trim();
    return res.json({ transcript });
  } catch (error: any) {
    console.error('Error transcribing audio:', error);
    return res.status(500).json({
      error: error?.message || 'Audio transcription unavailable.',
    });
  }
});

// Setup Vite middleware in dev or static serving in prod
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const server = http.createServer(app);

  // WebSocket Server for Live Voice Audio
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on('connection', async (clientWs: WebSocket) => {
    let session: any = null;

    clientWs.on('message', async (data) => {
      try {
        const payload = JSON.parse(data.toString());

        // Session initialization
        if (payload.type === 'init') {
          try {
            const { client } = getGenAIClient(payload.byokKey);
            const voice = payload.voice || 'Zephyr';

            // Connect to Gemini Live if supported by API credentials
            session = await client.live.connect({
              model: 'gemini-3.8-live',
              config: {
                responseModalities: ['AUDIO' as any],
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
                },
                systemInstruction: `You are TradePulse Live Voice Coach. Give short, direct, spoken answers (under 3 sentences) to help the trader maintain risk discipline.`,
              },
              callbacks: {
                onmessage: (message: any) => {
                  const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                  if (audio && clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(JSON.stringify({ type: 'audio', audio }));
                  }
                  if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(JSON.stringify({ type: 'interrupted' }));
                  }
                },
              },
            });

            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'ready' }));
            }
          } catch (liveErr: any) {
            console.warn('Gemini Live session not initialized directly; client will use standard voice bridge:', liveErr?.message);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'fallback_ready', message: 'Voice engine ready in streaming mode.' }));
            }
          }
          return;
        }

        // Live Audio Stream from user
        if (payload.audio && session) {
          session.sendRealtimeInput({
            audio: { data: payload.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        }
      } catch (err: any) {
        console.error('WebSocket Live message error:', err);
      }
    });

    clientWs.on('close', () => {
      if (session && typeof session.close === 'function') {
        try {
          session.close();
        } catch {}
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`TradePulse server with Live Voice WS running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
