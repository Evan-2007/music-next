import { SourceInterface } from '@/lib/sources/source-interface';
import {
  Song,
  Lyrics,
  SearchResult,
  Playlist,
  PlaylistSummary,
  ArtistData,
} from '@/lib/sources/types';

export class musicKit implements SourceInterface {
  async play(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async pause(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  playSong(): void {
    throw new Error('Method not implemented.');
  }
  getAllPlaylists(): void {
    throw new Error('Method not implemented.');
  }
  getQueue(): void {
    throw new Error('Method not implemented.');
  }
  getLyrics(): Promise<Lyrics> {
    throw new Error('Method not implemented.');
  }
  onTimeUpdate(): void {
    throw new Error('Method not implemented.');
  }
  onPlayPause(): void {
    throw new Error('Method not implemented.');
  }
  async seek(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  setVolume(): void {
    throw new Error('Method not implemented.');
  }
  getSongData(): Promise<Song> {
    throw new Error('Method not implemented.');
  }
  async getAlbumData(
    albumId: string,
    source: string
  ): Promise<import('../../types').AlbumData> {
    return {
      id: albumId,
      source: source,
      releaseDate: '',
      artWork: { url: '' },
      name: 'Album Name',
      artist: 'Album Artist',
      isSingle: false,
    };
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
