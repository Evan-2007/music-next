'use client';
import { SourceInterface } from '../source-interface';
import { platform } from '@tauri-apps/plugin-os';
import { WebNavidrome } from './web/navidrome';
import { Lyrics } from '../types';
import { Song, SearchResult, AlbumData, Playlist, PlaylistSummary, ArtistData } from '../types';

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

export class Navidrome implements SourceInterface {
  private platform: SourceInterface;

  constructor() {
    const currentPlatform = isTauri() ? platform() : 'web';
    this.platform = this.getPlatformImplementation(currentPlatform);
  }

  private getPlatformImplementation(platform: PlatformType): SourceInterface {
    const implementations: Record<string, new () => SourceInterface> = {
      android: WebNavidrome,
      ios: WebNavidrome,
      linux: WebNavidrome,
      macos: WebNavidrome,
      web: WebNavidrome,
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

  playSong(trackId: string): void {
    this.platform.playSong(trackId);
  }

  getAllPlaylists(): void {
    this.platform.getAllPlaylists();
  }

  getQueue(): void {
    this.platform.getQueue();
  }
  async getLyrics(trackId: string): Promise<Lyrics> {
    return await this.platform.getLyrics(trackId);
  }
  onTimeUpdate(
    callback: (currentTime: number, duration: number) => void
  ): void {
    this.platform.onTimeUpdate(callback);
  }
  async seek(time: number): Promise<void> {
    this.platform.seek(time);
    console.log(time);
  }

  onPlayPause(
    callback: (playing: 'playing' | 'paused' | 'ended') => void
  ): void {
    this.platform.onPlayPause(callback);
  }

  setVolume(volume: number): void {
    this.platform.setVolume(volume);
  }

  async getSongData(trackId: string): Promise<Song> {
    return await this.platform.getSongData(trackId);
  }
  async getAlbumData(albumId: string, source: string): Promise<AlbumData> {
    return await this.platform.getAlbumData(albumId, source);
  }
  async getPlaylists(): Promise<PlaylistSummary[]> {
    return await this.platform.getPlaylists();
  }
  async getPlaylistById(playlistId: string): Promise<Playlist> {
    return await this.platform.getPlaylistById(playlistId);
  }
  async getArtistById(artistId: string): Promise<ArtistData> {
    throw new Error('Method not implemented.');
  }
  async search(query: string): Promise<SearchResult> {
    return await this.platform.search(query);
  }
  async setRepeat(repeat: boolean): Promise<void> {
    return await this.platform.setRepeat(repeat);
  }
}
