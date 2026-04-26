const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const DOWNLOAD_DIR = path.join(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9\s\-_()]/gi, '').replace(/\s+/g, '_').substring(0, 80);
}

// ─── Search YouTube for top results (Returns JSON array) ──────────────────────
function searchYouTubeResults(query, count = 5) {
  return new Promise((resolve) => {
    const searchQuery = `"ytsearch${count}:${query}"`;
    const args = [searchQuery, '--dump-json', '--flat-playlist', '--no-warnings'];

    const proc = spawn('yt-dlp', args, { shell: true });
    let output = '';

    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { console.error('[yt-dlp search error]', data.toString()); });

    proc.on('close', (code) => {
      if (code !== 0) return resolve([]);
      try {
        const results = output
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => {
            const info = JSON.parse(line);
            return {
              id: info.id,
              url: info.url || `https://www.youtube.com/watch?v=${info.id}`,
              title: info.title || info.fulltitle,
              uploader: info.uploader || info.channel,
              duration: info.duration_string || `${Math.floor((info.duration||0) / 60)}:${String((info.duration||0) % 60).padStart(2, '0')}`,
              thumbnail: `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg`
            };
          })
          .filter(r => r.id && r.title);
        resolve(results.slice(0, count));
      } catch (e) {
        console.error('[search results parse error]', e.message);
        resolve([]);
      }
    });
    proc.on('error', () => resolve([]));
  });
}

// ─── Download a single song using yt-dlp (search + download in one step) ─────
function downloadSong(queryOrUrl, onStatus, onProgress, filenameHint = null) {
  return new Promise((resolve) => {
    // Determine if input is a direct URL or a search query
    const isUrl = queryOrUrl.startsWith('http://') || queryOrUrl.startsWith('https://');
    const target = isUrl ? `"${queryOrUrl}"` : `"ytsearch1:${queryOrUrl} official audio"`;
    
    // Use filenameHint if provided (from search results), else use query
    const baseName = filenameHint ? filenameHint : (isUrl ? 'downloaded_song' : queryOrUrl);
    const safeFilename = sanitizeFilename(baseName);
    const outputTemplate = path.join(DOWNLOAD_DIR, `${safeFilename}.%(ext)s`);
    const expectedFile = path.join(DOWNLOAD_DIR, `${safeFilename}.mp3`);

    // Skip if already downloaded
    if (fs.existsSync(expectedFile) && fs.statSync(expectedFile).size > 10_000) {
      onStatus('Already downloaded!');
      onProgress && onProgress(100);
      return resolve({ success: true, filePath: expectedFile });
    }

    onStatus(isUrl ? `Downloading from URL...` : `Searching YouTube & downloading "${queryOrUrl}"...`);

    const args = [
      target,
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--output', `"${outputTemplate}"`,
      '--no-playlist',
      '--no-warnings',
      '--progress',
      '--newline',
      '--concurrent-fragments', '5',
      '--format', 'bestaudio/best',
    ];

    const proc = spawn('yt-dlp', args, { shell: true });
    let lastPercent = 0;

    proc.stdout.on('data', (data) => {
      const line = data.toString().trim();
      console.log(`[yt-dlp] ${baseName}:`, line);

      const match = line.match(/(\d+\.?\d*)%/);
      if (match) {
        const percent = Math.round(parseFloat(match[1]));
        if (percent > lastPercent) {
          lastPercent = percent;
          onProgress && onProgress(percent);
          onStatus(`Downloading... ${percent}%`);
        }
      }
      if (line.includes('[ExtractAudio]') || line.includes('Post-process')) {
        onStatus('Converting to MP3...');
      }
    });

    proc.stderr.on('data', (data) => {
      console.error(`[yt-dlp error] ${baseName}:`, data.toString());
    });

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(expectedFile) && fs.statSync(expectedFile).size > 10_000) {
        return resolve({ success: true, filePath: expectedFile });
      }
      const allFiles = fs.readdirSync(DOWNLOAD_DIR)
        .filter((f) => f.startsWith(safeFilename) && f.endsWith('.mp3'));
      if (allFiles.length > 0) {
        return resolve({ success: true, filePath: path.join(DOWNLOAD_DIR, allFiles[0]) });
      }
      resolve({ success: false, error: `yt-dlp exited with code ${code}. Song not found or download failed.` });
    });

    proc.on('error', (err) => {
      resolve({ success: false, error: `Failed to run yt-dlp: ${err.message}` });
    });
  });
}

module.exports = { downloadSong, searchYouTubeResults, DOWNLOAD_DIR };
