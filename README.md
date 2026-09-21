# KODA-music-streamer
A full-stack React Native music streaming experiment featuring real-time encrypted audio decryption, multi-tier lyric synchronization, and paginated HTML scraping for cross-platform playlist imports. Built for educational and portfolio purposes only.


# 🎵 React Native Audio & Integration Sandbox

This project is a high-performance, cross-platform music streaming application built to demonstrate advanced full-stack systems integration, data scraping, cryptography, and native audio state management within a React Native environment. 

**⚠️ Disclaimer:** This project is an open-source experiment designed strictly for **Educational and Personal Portfolio Use Only**. It is not intended for commercial use or distribution. The application does not host, store, or distribute any copyrighted material. All data is retrieved dynamically via publicly accessible gateways to demonstrate API routing and web parsing techniques.

---

## 🧠 Full-Stack Architecture Highlights

While this is technically a client-side application, the data handling, security bypassing, and microservice-style routing built into the core logic mirror heavy backend systems engineering. 

### 1. Data Engineering & Security (The "Backend" Layer)
*   **Encrypted Stream Routing:** Utilizes `crypto-js` to decrypt DES-encrypted media URLs in real-time before passing them to the native audio player.
*   **Web Scraping & Firewall Bypassing:** Implements a headless extraction engine that disguises HTTP requests with Desktop user-agents. It parses raw HTML from Spotify's public web gateways to extract temporary access tokens and JSON state data, bypassing aggressive mobile API firewalls.
*   **Paginated Data Extraction:** Features a multi-page asynchronous loop algorithm to bypass API rate limits and 100-item hard caps, successfully scraping and resolving playlists of over 600+ items.
*   **Multi-Tier Fallback Engines:** The search and lyrics modules do not rely on a single point of failure. If the primary REST API fails or returns null, the engine dynamically waterfalls through 4 distinct fallback sources (e.g., LRCLIB, Saavn.dev) using fuzzy string matching and regex sanitization to guarantee a data return.

### 2. Native Audio & State Management (The "Frontend" Layer)
*   **Native Thread Synchronization:** Uses standard Track Player native event listeners (`PlaybackTrackChanged`, `remote-duck`) to bridge the gap between the native Android/iOS audio engine and the React JavaScript thread, ensuring the UI (lyrics, artwork, queues) never desyncs from the background audio.
*   **Centralized Context Architecture:** Replaces scattered prop-drilling with a robust `PlayerContext` that manages the global queue, active song states, and background fetching logic.
*   **Local Persistence:** Implements a highly optimized CRUD interface over `AsyncStorage` for instantaneous library management (creating, appending, and deleting playlists) without requiring a cloud database.

---

## 🛠 Tech Stack

**Client & UI**
*   React Native / Expo
*   React Context API (Global State Management)
*   Animated API (Interactive UI / Full-Screen Transitions)

**Audio & Hardware**
*   `react-native-track-player` (Background audio, lock-screen controls, native queueing)

**Data, Networking & Security**
*   `axios` & `fetch` (HTTP interceptors, custom headers)
*   `crypto-js` (ECB mode decryption for media streams)
*   RegEx & HTML Parsing (Token extraction from embedded DOM scripts)

---

## 📦 App Components Breakdown

*   **`MusicService.ts`**: The core data engine. Handles complex auto-complete resolution (separating album queries from direct track queries), lyrics fetching, and media decryption.
*   **`PlayerContext.tsx`**: The global state controller. Manages queue locking, native playback synchronization, and background track recommendation fetches.
*   **`App.tsx` (Main Controller)**: Houses the persistent Library state, the Spotify DOM-scraping importer algorithm, and the root navigation structure.
*   **`SearchScreen` / `LibraryScreen`**: The primary user interfaces featuring dynamic grid layouts, modal overlays, and memoized lists (`FlatList`) optimized for rendering hundreds of tracks without memory leaks.
*   **`MiniPlayer` / `FullScreenPlayer`**: Responsive playback components that scale seamlessly using native animations.

---

## 🚀 Installation & Setup

Because this application relies on custom native audio modules (`react-native-track-player`), it **cannot** be run inside standard Expo Go. You must compile a native development build.

**1. Clone the repository**
```bash
git clone [https://github.com/YourUsername/YourRepoName.git](https://github.com/YourUsername/YourRepoName.git)
cd YourRepoName
