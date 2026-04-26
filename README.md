<div align="center">
  
# 🎵 SoundDrop

**A lightning-fast, sleek, and minimalist YouTube to MP3 downloader.**

[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![yt-dlp](https://img.shields.io/badge/yt--dlp-Latest-red?logo=youtube&logoColor=white)](https://github.com/yt-dlp/yt-dlp)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

*Search YouTube directly, preview audio, and download high-quality MP3s instantly to your device.*

</div>

---

## ✨ Features

- **Live Search & Autocomplete:** Real-time search suggestions powered by Google as you type.
- **Inline Audio Player:** Preview songs directly from the search results to ensure you have the right track before downloading.
- **Real-Time Progress:** Watch your download and conversion progress live via WebSockets.
- **Zero Traces:** Files are piped directly to your browser's native download manager and instantly deleted from the server.
- **Premium UI:** A stunning, fully responsive Glassmorphism design with dynamic CSS animations.
- **Docker Ready:** Deploy anywhere instantly without worrying about Python or FFmpeg dependencies.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla JS, HTML5, CSS3 (Glassmorphism & Custom Animations)
- **Backend:** Node.js, Express.js
- **Real-Time:** WebSockets (`ws`)
- **Core Engine:** `yt-dlp` (Python) + `FFmpeg`

---

## 🚀 Getting Started (Local Setup)

### Prerequisites
Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/en/download/) (v18 or higher)
- [Python 3](https://www.python.org/downloads/)
- [FFmpeg](https://ffmpeg.org/download.html) (Must be added to your system PATH)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp/wiki/Installation) (Must be added to your system PATH)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sounddrop.git
   cd sounddrop
   ```

2. **Install Node dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   node server.js
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000` to start downloading!

---

## 🐳 Docker Setup (Recommended for Cloud / VPS)

Don't want to install Python and FFmpeg manually? Use Docker! It packages everything into an isolated environment.

1. **Build the Docker Image**
   ```bash
   docker build -t sounddrop .
   ```

2. **Run the Container**
   ```bash
   docker run -p 3000:3000 sounddrop
   ```
   *The app is now running at `http://localhost:3000`.*

---
 



## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---
<div align="center">
  <i>Designed and built by Shiraz Ali</i>
</div>
