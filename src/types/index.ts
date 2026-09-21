export type Song = {
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork: string;
  duration?: number;
};

export type Playlist = {
  id: string;
  name: string;
  songs: Song[];
};