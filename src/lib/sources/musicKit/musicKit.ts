'use client';
import { SourceInterface } from '../source-interface';
import { platform } from '@tauri-apps/plugin-os';
import { musicKit as IosMusicKit } from './ios/musicKit';
import { musicKit as AndroidMusicKit } from './android/musicKit';
import { musicKit as WebMusicKit } from './web/musicKit';
import {
  Lyrics,
  Song,
  SearchResult,
  AlbumData,
  Playlist,
  PlaylistSummary,
  ArtistData,
} from '../types';

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

export class MusicKit implements SourceInterface {
  private platform: SourceInterface;

  constructor() {
    const currentPlatform = isTauri() ? platform() : 'web';
    this.platform = this.getPlatformImplementation(currentPlatform);
  }

  private getPlatformImplementation(platform: PlatformType): SourceInterface {
    const implementations: Record<string, new () => SourceInterface> = {
      android: AndroidMusicKit,
      ios: IosMusicKit,
      web: WebMusicKit,
    };

    const Implementation = implementations[platform];
    if (!Implementation) {
      throw new Error(`Platform ${platform} not supported`);
    }

    return new Implementation();
  }

  async play(): Promise<void> {
    await this.platform.play();
  }

  async pause(): Promise<void> {
    console.log('Pausing song');
    await this.platform.pause();
  }

  async playSong(songId: string): Promise<void> {
    await this.platform.playSong(songId);
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
    await this.platform.seek(time);
  }
  setVolume(volume: number): void {
    this.platform.setVolume(volume);
  }
  getSongData(songId: string): Promise<Song> {
    return this.platform.getSongData(songId);
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
    return await this.platform.getArtistById(artistId);
  }
  async search(query: string): Promise<SearchResult> {
    console.log('searching');
    return await this.platform.search(query);
  }

  setRepeat(repeat: boolean): Promise<void> {
    return this.platform.setRepeat(repeat);
  }
}
