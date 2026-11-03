import { validateSpeech, escapeSpeech } from "./speech-policy.js";

/** Mount after your CORS and express.json({ limit: '8kb' }) middleware. */
export function attachSpeech(app, { allowedOrigins = [], maxConcurrent = 4 } = {}) {
  let active = 0;
  const requests = new Map();
  app.post("/api/tts", async (req, res) => {
    // This public game has no account login. Restrict browser origins, size, rate and concurrency.
    if (!allowedOrigins.includes(req.get("origin"))) return res.status(403).json({ error: "Origin not allowed" });
    const input = validateSpeech(req.body);
    if (!input) return res.status(400).json({ error: "Invalid speech request" });
    const now = Date.now();
    for (const [key, value] of requests) if (value.until <= now) requests.delete(key);
    const key = req.ip; // Configure Express trust proxy for your Render deployment; never trust arbitrary X-Forwarded-For.
    const limit = requests.get(key) ?? { until: now + 60_000, count: 0 };
    if (limit.count >= 120 || active >= maxConcurrent) {
      res.set("Retry-After", "5");
      return res.status(429).json({ error: "Speech busy; try again" });
    }
    limit.count++;
    requests.set(key, limit);
    active++;
    let tts;
    let stream;
    let closed = false;
    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearTimeout(timeout);
      active--;
      stream?.destroy();
      tts?.close();
    };
    const timeout = setTimeout(() => {
      if (!res.headersSent) res.status(504).json({ error: "Speech timed out" });
      else res.destroy();
      cleanup();
    }, 20_000);
    res.on("close", cleanup);
    try {
      // Node-only dependency stays on Render, never in the React/SSR bundle.
      const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
      if (closed) return;
      tts = new MsEdgeTTS({ connectionTimeoutMs: 8000, synthesisTimeoutMs: 15000 });
      await tts.setMetadata(input.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      if (closed) { tts.close(); return; }
      ({ audioStream: stream } = tts.toStream(escapeSpeech(input.text)));
      res.set({ "Content-Type": "audio/mpeg", "Cache-Control": "no-store" });
      stream.on("error", () => {
        if (!res.headersSent) res.status(502).json({ error: "Voice service unavailable" });
        else res.destroy();
        cleanup();
      });
      stream.pipe(res);
    } catch {
      if (!closed && !res.headersSent) res.status(502).json({ error: "Voice service unavailable" });
      cleanup();
    }
  });
}