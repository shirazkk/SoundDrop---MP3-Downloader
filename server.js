const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { downloadSong, scrapeSongList, DOWNLOAD_DIR } = require("./downloader");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

wss.on("connection", (ws) => {
  console.log("Client connected via WebSocket");
  ws.on("close", () => console.log("Client disconnected"));
});

function broadcastToAll(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// ─── Autocomplete Suggestions ──────────────────────────────────────────────────
app.get("/api/autocomplete", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);
  try {
    const response = await fetch(
      `http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`,
    );
    const data = await response.json();
    res.json(data[1] || []);
  } catch (err) {
    res.json([]);
  }
});

// ─── Search Results (Top 5) ──────────────────────────────────────────────────
app.post("/api/search", async (req, res) => {
  const { query } = req.body;
  if (!query || !query.trim())
    return res.status(400).json({ error: "Query required" });

  const { searchYouTubeResults } = require("./downloader");
  const results = await searchYouTubeResults(query.trim(), 5);
  res.json({ results });
});

// ─── Single Song Download ────────────────────────────────────────────────────
app.post("/api/download", async (req, res) => {
  const { songName, url, title } = req.body;
  const target = url || songName;
  const nameToDisplay = title || songName;

  if (!target || !target.trim()) {
    return res.status(400).json({ error: "Song name or URL is required" });
  }

  const jobId = uuidv4();
  res.json({ jobId, message: "Download started" });

  // Run download in background
  (async () => {
    broadcastToAll({
      type: "progress",
      jobId,
      songName: nameToDisplay,
      status: "searching",
      message: "Starting download...",
      percent: 0,
    });

    const result = await downloadSong(
      target.trim(),
      (message) => {
        broadcastToAll({
          type: "progress",
          jobId,
          songName: nameToDisplay,
          status: "downloading",
          message,
          percent: 0,
        });
      },
      (percent) => {
        broadcastToAll({
          type: "progress",
          jobId,
          songName: nameToDisplay,
          status: "downloading",
          message: `Downloading... ${percent}%`,
          percent,
        });
      },
      title || null, // use title as filename hint if provided
    );

    if (result.success) {
      const fileName = path.basename(result.filePath);
      broadcastToAll({
        type: "complete",
        jobId,
        songName: nameToDisplay,
        status: "complete",
        message: "Download complete!",
        filePath: result.filePath,
        fileName: fileName,
        percent: 100,
      });
    } else {
      broadcastToAll({
        type: "error",
        jobId,
        songName: nameToDisplay,
        status: "error",
        message: result.error || "Download failed",
        percent: 0,
      });
    }
  })();
});

// Removed batch endpoint

// ─── Serve File for Browser Download & Delete ────────────────────────────────
app.get("/api/serve-file", (req, res) => {
  const file = req.query.file;
  if (!file) return res.status(400).send("File required");

  const filePath = path.join(DOWNLOAD_DIR, file);
  if (fs.existsSync(filePath)) {
    res.download(filePath, file, (err) => {
      // Once the browser finishes downloading, delete the file from the backend
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted temp file: ${file}`);
        }
      } catch (e) {
        console.error("Failed to delete temp file:", e.message);
      }
    });
  } else {
    res.status(404).send("File not found");
  }
});

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`\n🎵 Song Downloader running at http://localhost:${PORT}`);
});
