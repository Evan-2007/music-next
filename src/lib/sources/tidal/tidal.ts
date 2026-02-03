'use client';
import { SourceInterface } from '../source-interface';
import { platform } from '@tauri-apps/plugin-os';
import { tidal as IosTidal } from './ios/tidal';
import { tidal as AndroidTidal } from './android/tidal';
import { tidal as WebTidal } from './web/tidal';
import { Lyrics, Song, AlbumData } from '../types';
import { SearchResult } from '../types';
import { Playlist, PlaylistSummary, ArtistData } from '../types';

type PlatformType =
  | 'windows'
  | 'linux'
  | 'macos'
  | 'android'
  | 'ios'
  | 'web'
  | string;

const isTauri = () => {
  return 'window' in globalThis && 'window.__TAURI__' in window;
};

export class Tidal implements SourceInterface {
  private platform: SourceInterface;

  constructor() {
    const currentPlatform = isTauri() ? platform() : 'web';
    this.platform = this.getPlatformImplementation(currentPlatform);
  }

  private getPlatformImplementation(platform: PlatformType): SourceInterface {
    const implementations: Record<string, new () => SourceInterface> = {
      android: AndroidTidal,
      ios: IosTidal,
      web: WebTidal,
    };

    const Implementation = implementations[platform];
    if (!Implementation) {
      throw new Error(`Platform ${platform} not supported`);
    }

    return new Implementation();
  }

  async play(): Promise<void> {
    this.platform.play();
  }

  async pause(): Promise<void> {
    this.platform.pause();
  }

  playSong(songId: string): void {
    this.platform.playSong(songId);
  }

  getAllPlaylists(): void {
    this.platform.getAllPlaylists();
  }

  getQueue(): void {
    this.platform.getQueue();
  }
  async getLyrics(songId: string): Promise<Lyrics> {
    return await this.platform.getLyrics(songId);
  }
  onTimeUpdate(
    callback: (currentTime: number, duration: number) => void
  ): void {
    this.platform.onTimeUpdate(callback);
  }
  onPlayPause(
    callback: (playing: 'playing' | 'paused' | 'ended') => void
  ): void {
    this.platform.onPlayPause(callback);
  }
  async seek(time: number): Promise<void> {
    this.platform.seek(time);
  }
  setVolume(volume: number): void {
    this.platform.setVolume(volume);
  }
  getSongData(songId: string): Promise<Song> {
    return this.platform.getSongData(songId);
  }

  async getAlbumData(albumId: string, source: string): Promise<AlbumData> {
    return this.platform.getAlbumData(albumId, source);
  }
  async getPlaylists(): Promise<PlaylistSummary[]> {
    throw new Error('Method not implemented.');
  }
  async getPlaylistById(playlistId: string): Promise<Playlist> {
    throw new Error('Method not implemented.');
  }

  async getArtistById(artistId: string): Promise<ArtistData> {
    throw new Error('Method not implemented.');
  }

  async search(query: string): Promise<SearchResult> {
    throw new Error('Method not implemented.');
  }
  async setRepeat(repeat: boolean): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
