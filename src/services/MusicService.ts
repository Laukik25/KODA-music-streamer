import axios from 'axios';
import CryptoJS from 'crypto-js';

export interface Song {
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork: string;
  duration: number;
}

export interface LyricLine {
  time: number;
  text: string;
}

const LRCLIB_HEADERS = {
  headers: { 'User-Agent': 'React-Native-Music-App/1.0 (music@example.com)' }
};

class MusicService {
  private static decryptAudioUrl(encryptedUrl: any): string {
    if (!encryptedUrl || typeof encryptedUrl !== 'string') return '';
    try {
      const key = CryptoJS.enc.Utf8.parse('38346591');
      const decrypted = CryptoJS.DES.decrypt(
        { ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl) } as any,
        key,
        { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
      );
      let finalUrl = decrypted.toString(CryptoJS.enc.Utf8);
      if (!finalUrl) return '';
      return finalUrl.replace('_96.mp4', '_320.mp4').replace('_160.mp4', '_320.mp4');
    } catch (error) {
      return '';
    }
  }

  private static async fetchJSON(url: string) {
    try {
      const response = await axios.get(url);
      let data = response.data;
      if (typeof data === 'string') {
        const firstBrace = data.indexOf('{');
        const firstBracket = data.indexOf('[');
        const startIdx = (firstBrace !== -1 && firstBracket !== -1) ? Math.min(firstBrace, firstBracket) : Math.max(firstBrace, firstBracket);
        if (startIdx !== -1) data = JSON.parse(data.substring(startIdx));
        else data = JSON.parse(data);
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  static async getSyncedLyrics(title: string, artist: string, songId: string): Promise<LyricLine[]> {
    const safeTitle = String(title || '');
    const safeArtist = String(artist || '');
    
    const cleanTitle = safeTitle.replace(/\[.*?\]|\(.*?\)|- .*/g, '').trim();
    const cleanArtist = safeArtist.split(',')[0].split('&')[0].trim();
    
    try {
      let res = await axios.get(`https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`, LRCLIB_HEADERS);
      if (res.data?.syncedLyrics) return this.parseLRC(res.data.syncedLyrics);
      if (res.data?.plainLyrics) return [{ time: -1, text: res.data.plainLyrics }];
    } catch (error) {}

    try {
      const res = await axios.get(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle)}`, LRCLIB_HEADERS);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const synced = res.data.find((track: any) => track.syncedLyrics);
        if (synced) return this.parseLRC(synced.syncedLyrics);
        
        const plain = res.data.find((track: any) => track.plainLyrics);
        if (plain) return [{ time: -1, text: plain.plainLyrics }];
      }
    } catch (error) {}

    try {
      const saavnDev = await axios.get(`https://saavn.dev/api/songs/${songId}/lyrics`);
      if (saavnDev.data?.data?.lyrics) {
         return [{ time: -1, text: String(saavnDev.data.data.lyrics).replace(/<br\s*\/?>/gi, '\n') }];
      }
    } catch (e) {}

    try {
      const jioLyrics = await this.fetchJSON(`https://www.jiosaavn.com/api.php?__call=lyrics.get&lyrics_id=${songId}&ctx=web6dot0&_format=json`);
      if (jioLyrics && jioLyrics.lyrics) {
         return [{ time: -1, text: String(jioLyrics.lyrics).replace(/<br\s*\/?>/gi, '\n').replace(/&quot;/g, '"') }];
      }
    } catch(e) {}

    return [];
  }

  private static parseLRC(lrc: string): LyricLine[] {
    if (!lrc || typeof lrc !== 'string') return [];
    const lines = lrc.split('\n');
    const synced: LyricLine[] = [];
    const regex = /\[(\d{2}):(\d{2}\.\d{2})\](.*)/;
    let lastTime = -1;

    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        const mins = parseInt(match[1], 10);
        const secs = parseFloat(match[2]);
        const time = mins * 60 + secs;
        let text = match[3].split('/')[0].split('|')[0].trim();
        
        if (text) {
          if (Math.abs(time - lastTime) < 0.1) continue; 
          synced.push({ time, text });
          lastTime = time;
        }
      }
    }
    return synced;
  }

  // --- PERFECTED SEARCH LOGIC (Movies AND English Singles Work!) ---
  static async search(query: string): Promise<Song[]> {
    const cleanQuery = String(query || '').trim();
    const lowerQuery = cleanQuery.toLowerCase();
    const preferredLanguages = ['hindi', 'marathi', 'english'];
    let autoData: any = null;

    try {
      autoData = await this.fetchJSON(`https://www.jiosaavn.com/api.php?__call=autocomplete.get&query=${encodeURIComponent(cleanQuery)}&_format=json&ctx=web6dot0`);
      const topMatch = autoData?.topmatch?.data?.[0];

      // 1. Artist Override
      if (topMatch?.type === 'artist') {
        const artistData = await this.fetchJSON(`https://www.jiosaavn.com/api.php?__call=artist.getArtistPageDetails&artistId=${topMatch.id}&n_song=50&_format=json&ctx=web6dot0`);
        if (artistData?.topSongs) return this.formatSongs(artistData.topSongs);
      }

      // 2. THE MOVIE/ALBUM OVERRIDE (EXACTLY AS IT WAS 4 PROMPTS AGO)
      // This aggressively fetches the movie album (like "3 Idiots" or "Bahubali").
      // It bypasses ONLY if JioSaavn explicitly flags the search term as a single track (like "Starboy").
      if (topMatch?.type !== 'song' && autoData?.albums?.data?.length > 0) {
        const bestAlbum = autoData.albums.data.find((a: any) =>
           String(a.title || '').toLowerCase() === lowerQuery && preferredLanguages.includes((String(a.language || '')).toLowerCase())
        ) || autoData.albums.data.find((a: any) => preferredLanguages.includes((String(a.language || '')).toLowerCase())) || autoData.albums.data[0];

        if (bestAlbum) {
           const aData = await this.fetchJSON(`https://www.jiosaavn.com/api.php?__call=content.getAlbumDetails&albumid=${bestAlbum.id}&_format=json&ctx=web6dot0`);
           if (aData?.list || aData?.songs) {
              const rawSongs = aData.list || aData.songs;
              if (rawSongs.length > 0) return this.formatSongs(rawSongs);
           }
        }
      }

      // 3. Playlist Override
      if (autoData?.playlists?.data?.length > 0 && /(playlist|mix|mashup)/i.test(lowerQuery)) {
        const pData = await this.fetchJSON(`https://www.jiosaavn.com/api.php?__call=playlist.getDetails&listid=${autoData.playlists.data[0].id}&_format=json&ctx=web6dot0`);
        if (pData?.list || pData?.songs) return this.formatSongs(pData.list || pData.songs);
      }

      // 4. THE ENGLISH SINGLE FALLBACK
      // If the user searches a Western track ("Starboy", "Shape of You"), it directly grabs the song matches here!
      if (autoData?.songs?.data?.length > 0) {
        return this.formatSongs(autoData.songs.data);
      }

    } catch (e) {}

    // 5. Global Deep Search (Safety net)
    try {
      const searchData = await this.fetchJSON(`https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(cleanQuery)}&n=50&p=1&_format=json&ctx=web6dot0`);
      if (searchData?.results?.length > 0) {
        return this.formatSongs(searchData.results);
      }
    } catch (e) {}

    return [];
  }

  private static formatSongs(rawList: any[]): Song[] {
    if (!rawList || !Array.isArray(rawList)) return [];
    return rawList.map((song: any) => ({
      id: String(song.id || ''),
      title: MusicService.cleanText(song.song || song.title || 'Unknown Title'),
      artist: MusicService.cleanText(song.primary_artists || song.subtitle || song.singers || 'Unknown Artist'),
      artwork: String(song.image || 'https://via.placeholder.com/150').replace('150x150', '500x500'),
      url: '', 
      duration: 0,
    }));
  }

  static async getSongDetails(songId: string): Promise<Song | null> {
    try {
      const data = await this.fetchJSON(`https://www.jiosaavn.com/api.php?__call=song.getDetails&pids=${songId}&_format=json&ctx=web6dot0`);
      if (!data) return null;
      const songData = data[songId] || data.songs?.[0];
      if (!songData) return null;
      const encryptedUrl = songData.encrypted_media_url || songData.more_info?.encrypted_media_url || '';
      const rawDuration = songData.duration || songData.more_info?.duration || 0;

      return {
        id: String(songData.id || songId),
        title: MusicService.cleanText(songData.song || songData.title || 'Unknown Title'),
        artist: MusicService.cleanText(songData.primary_artists || songData.subtitle || songData.singers || 'Unknown Artist'),
        artwork: String(songData.image || 'https://via.placeholder.com/150').replace('150x150', '500x500'),
        url: this.decryptAudioUrl(encryptedUrl),
        duration: Number(rawDuration) || 0,
      };
    } catch (error) {
      return null;
    }
  }

  public static async getRecommendations(songId: string): Promise<Song[]> {
    try {
      const data = await this.fetchJSON(`https://www.jiosaavn.com/api.php?__call=reco.getreco&pid=${songId}&_format=json&ctx=web6dot0`);
      if (!data || !Array.isArray(data)) return [];
      return data.map((songData: any) => ({
        id: String(songData.id || ''),
        title: MusicService.cleanText(songData.song || songData.title || 'Unknown Title'),
        artist: MusicService.cleanText(songData.primary_artists || songData.subtitle || songData.singers || 'Unknown Artist'),
        artwork: String(songData.image || 'https://via.placeholder.com/150').replace('150x150', '500x500'),
        url: '', 
        duration: Number(songData.duration || 0)
      }));
    } catch (error) {
      return [];
    }
  }

  private static cleanText(text: any): string {
    if (!text || typeof text !== 'string') return String(text || '');
    return text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
  }

  private static async searchDirectTrack(query: string): Promise<Song | null> {
    try {
      const searchData = await this.fetchJSON(`https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(query)}&n=3&p=1&_format=json&ctx=web6dot0`);
      if (searchData?.results?.length > 0) {
        return this.formatSongs([searchData.results[0]])[0];
      }
    } catch (e) {}
    return null;
  }

  static async importWebPlaylist(url: string): Promise<Song[]> {
    const cleanUrl = String(url || '').trim();

    try {
      if (cleanUrl.includes('spotify.com/playlist')) {
        const playlistIdMatch = cleanUrl.match(/playlist\/([a-zA-Z0-9]+)/);
        if (!playlistIdMatch) return [];
        const playlistId = playlistIdMatch[1];

        const tokenRes = await axios.get('https://open.spotify.com/get_access_token?reason=transport&productType=web_player');
        const token = tokenRes.data?.accessToken;
        if (!token) throw new Error("Token failed");

        const res = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.data || !res.data.items) return [];

        const trackQueries = res.data.items
          .filter((item: any) => item.track)
          .map((item: any) => `${item.track.name} ${item.track.artists[0]?.name || ''}`.trim());

        const mappedSongs: Song[] = [];
        const chunkSize = 5; 
        
        for (let i = 0; i < trackQueries.length; i += chunkSize) {
          const chunk = trackQueries.slice(i, i + chunkSize);
          const chunkResults = await Promise.all(
            chunk.map(async (query: string) => {
              return await this.searchDirectTrack(query);
            })
          );
          
          chunkResults.forEach(song => { if (song) mappedSongs.push(song); });
        }
        return mappedSongs;
      } 
      else if (cleanUrl.includes('jiosaavn.com')) {
        const tokenMatch = cleanUrl.match(/(?:list|playlist|featured)\/.*\/([^/]+)$/);
        if (tokenMatch) {
           const pData = await this.fetchJSON(`https://www.jiosaavn.com/api.php?__call=webapi.get&token=${tokenMatch[1]}&type=playlist&_format=json&ctx=web6dot0`);
           if (pData?.list || pData?.songs) return this.formatSongs(pData.list || pData.songs);
        }
      }
    } catch (error) {
      console.log("Importer Error:", error);
    }
    return [];
  }
}

export default MusicService;
export { MusicService };