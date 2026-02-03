import {
  Lyrics,
  Song,
  SearchResult,
  AlbumData,
  PlaylistSummary,
  Playlist,
  ArtistData,
} from './types';

export interface SourceInterface {
  play(): Promise<void>;
  pause(): Promise<void>;
  playSong(trackId: string, sourceId?: string): void;
  getAllPlaylists(): void;
  getQueue(): void;
  getLyrics(trackId: string): Promise<Lyrics>;
  onTimeUpdate(callback: (currentTime: number, duration: number) => void): void;
  onPlayPause(
    callback: (playing: 'playing' | 'paused' | 'ended') => void
  ): void;
  seek(time: number): Promise<void>;
  setVolume(volume: number): void;
  getSongData(trackId: string): Promise<Song>;
  search(query: string): Promise<SearchResult>;
  setRepeat(repeat: boolean): Promise<void>;
  getAlbumData(albumId: string, source: string): Promise<AlbumData>;
  getPlaylists(): Promise<PlaylistSummary[]>;
  getPlaylistById(playlistId: string): Promise<Playlist>;
  getArtistById(artistId: string): Promise<ArtistData>;
}
