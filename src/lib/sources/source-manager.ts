import { SourceInterface } from './source-interface';
import { Tidal } from './tidal/tidal';
import { Navidrome } from './navidrome/navidrome';
import {
  Lyrics,
  Song,
  sources,
  ArtistSummary as Artist,
  AlbumSummary as Album,
  SearchResult,
  AlbumData,
  PlaylistSummary,
  Playlist,
  ArtistData,
} from './types';
import { getLRCLIBLyrics } from './lrc-lib/lrc-lib';
import { MusicKit } from './musicKit/musicKit';

type PlaybackStatus = 'playing' | 'paused' | 'ended';
type TimeUpdateListener = (position: number, duration: number) => void;
type PlayPauseListener = (playing: PlaybackStatus) => void;

interface CurrentTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  source: string;
  position: number;
  album?: string;
}

interface ExtendedSong extends Song {
  _firstAppearanceIndex: number;
}
interface ExtendedAlbum extends Album {
  _firstAppearanceIndex: number;
}
interface ExtendedArtist extends Artist {
  _firstAppearanceIndex: number;
}

export class SourceManager {
  private static instance: SourceManager;
  private readonly sources: Map<string, SourceInterface>;
  public activeSource: string | null;
  private currentTrack: CurrentTrack | null;

  // Playback state
  private currentPosition: number;
  private trackDuration: number;
  private playing: PlaybackStatus;
  private timeUpdateInterval: NodeJS.Timeout | null;
  private repeatState: boolean;

  // Event listeners
  private readonly timeUpdateListeners: Set<TimeUpdateListener>;
  private readonly playPauseListeners: Set<PlayPauseListener>;

  // NEW: Promise that resolves once all sources (including MusicKit) are ready
  private initializationPromise: Promise<void>;

  private constructor() {
    this.sources = new Map();
    this.activeSource = null;
    this.currentTrack = null;
    this.currentPosition = 0;
    this.trackDuration = 0;
    this.playing = 'paused';
    this.timeUpdateInterval = null;
    this.timeUpdateListeners = new Set();
    this.playPauseListeners = new Set();
    this.repeatState = false;

    if (typeof window !== 'undefined') {
      // Begin async loading of sources (including MusicKit)
      this.initializationPromise = this.initializeSources();
    } else {
      // On server side, just resolve immediately
      this.initializationPromise = Promise.resolve();
    }
  }

  public static getInstance(): SourceManager {
    if (!SourceManager.instance) {
      SourceManager.instance = new SourceManager();
    }
    return SourceManager.instance;
  }

  private async initializeSources(): Promise<void> {
    if (localStorage.getItem('activeServer') !== 'undefined') {
      this.sources.set('navidrome', new Navidrome());
    }
    await this.checkMusicKit(); // Make sure MusicKit is loaded
  }

  public addSource(source: string): void {
    // if (source === 'tidal') {
    //   this.sources.set('tidal', new Tidal());
    // }
    if (source === 'musicKit') {
      this.sources.set('musicKit', new MusicKit());
    }
  }

  private checkMusicKit(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (
        typeof window !== 'undefined' &&
        (window as any).musicKitStatus === 'ready'
      ) {
        console.log('MusicKit already configured');
        resolve();
        return;
      }
      const timeoutDuration = 10000; // 10 seconds
      const timeout = setTimeout(() => {
        console.warn('MusicKit load timed out');
        resolve(); // Or reject() depending on your requirements
      }, timeoutDuration);

      window.addEventListener('musickitready', () => {
        clearTimeout(timeout);
        console.log('MusicKit loaded');
        this.sources.set('musicKit', new MusicKit());
        resolve();
      });

      console.log('MusicKit check initialized');
    });
  }

  // Time tracking
  public setPosition(position: number): void {
    this.currentPosition = position;
    this.emitTimeUpdate();
  }

  public setDuration(duration: number): void {
    this.trackDuration = duration;
    this.emitTimeUpdate();
  }

  public getPosition(): number {
    return this.currentPosition;
  }

  public getDuration(): number {
    return this.trackDuration;
  }

  public getPlaying(): PlaybackStatus {
    return this.playing;
  }

  public setPlaying(playing: PlaybackStatus): void {
    this.playing = playing;
    this.emitPlayPause();
  }

  // Event handling
  public onPlayPause(callback: PlayPauseListener): () => void {
    this.playPauseListeners.add(callback);
    return () => this.playPauseListeners.delete(callback);
  }

  private emitPlayPause(): void {
    this.playPauseListeners.forEach((callback) => callback(this.playing));
  }

  public onTimeUpdate(callback: TimeUpdateListener): () => void {
    this.timeUpdateListeners.add(callback);
    return () => this.timeUpdateListeners.delete(callback);
  }

  private emitTimeUpdate(): void {
    this.timeUpdateListeners.forEach((callback) =>
      callback(this.currentPosition, this.trackDuration)
    );
  }

  private stopTimeUpdates(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  // Playback control
  public async playSong(track: Song): Promise<void> {
    // WAIT HERE for all async init to complete:
    await this.initializationPromise;
    console.log(track.availableSources);
    const sourcePriority =
      localStorage.getItem('sourcePriority') ||
      '["navidrome", "tidal", "musicKit"]';

    const parsedSourcePriority: string[] = JSON.parse(sourcePriority);

    console.log('sourcePriority', sourcePriority);

    // Find the first available source
    const sourceId = parsedSourcePriority.find((source) =>
      track.availableSources.includes(source)
    );
    console.log('sourceId', sourceId, track.title);
    if (!sourceId) {
      console.error(
        `No available source found. Sources: ${Array.from(this.sources.keys()).join(', ')}`
      );
      return;
    }

    const source = this.sources.get(sourceId);
    if (!source) {
      console.error(`Source ${sourceId} not found`);
      return;
    }

    // Handle source switching
    if (this.activeSource && this.activeSource !== sourceId) {
      const currentSource = this.sources.get(this.activeSource);
      if (currentSource) {
        await currentSource.pause();
      }
    }

    this.activeSource = sourceId;

    // Set up event handlers
    source.onTimeUpdate((currentTime: number, duration: number) => {
      this.setPosition(currentTime);
      this.setDuration(duration);
    });

    source.onPlayPause((playing: PlaybackStatus) => {
      this.setPlaying(playing);
    });

    this.currentTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      source: sourceId,
      position: 0,
      album: track.album,
    };

    // Play the song
    await source.playSong(track.id);

    await source.setRepeat(this.repeatState);
    this.resetPlaybackState();
  }

  private resetPlaybackState(): void {
    this.currentPosition = 0;
    this.trackDuration = 0;
  }

  public async pause(): Promise<void> {
    // Optionally await initialization if needed:
    await this.initializationPromise;

    const source = this.getActiveSource();
    console.log('source', source);
    if (source) {
      await source.pause();
      this.stopTimeUpdates();
    } else {
      console.error('No active source to pause');
    }
  }

  public async play(): Promise<void> {
    // Optionally await initialization if needed:
    await this.initializationPromise;

    const source = this.getActiveSource();
    if (source) {
      await source.play();
    }
  }

  public async seek(position: number): Promise<void> {
    // Optionally await initialization if needed:
    await this.initializationPromise;

    const source = this.getActiveSource();
    if (source) {
      await source.seek(position);
    }
  }

  public async setRepeat(repeat: boolean): Promise<void> {
    // Optionally await initialization if needed:
    await this.initializationPromise;
    this.repeatState = repeat;
    const source = this.getActiveSource();
    if (source) {
      await source.setRepeat(repeat);
    }
  }

  public async setVolume(volume: number): Promise<void> {
    // Optionally await initialization if needed:
    await this.initializationPromise;

    const source = this.getActiveSource();
    if (source) {
      await source.setVolume(volume);
    }
  }

  private getActiveSource(): SourceInterface | null {
    return this.activeSource
      ? this.sources.get(this.activeSource) || null
      : null;
  }

  public formatTime(seconds: number): string {
    const totalMilliseconds = Math.round(seconds * 1000);
    const totalSeconds = Math.floor(totalMilliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  public async getSongData(trackId: string, source: string): Promise<Song> {
    await this.initializationPromise; // Just to be safe, if needed

    const sourceInstance = this.sources.get(source);
    if (!sourceInstance) {
      return Promise.reject('Source not found');
    }
    return sourceInstance.getSongData(trackId);
  }

  // Get album data
  public async getAlbumData(
    albumId: string,
    source: string
  ): Promise<AlbumData> {
    await this.initializationPromise;

    const sourceInstance = this.sources.get(source);
    if (!sourceInstance) {
      return Promise.reject('Source not found');
    }
    return sourceInstance.getAlbumData(albumId, source);
  }

  public async getPlaylists(): Promise<PlaylistSummary[]> {
    await this.initializationPromise;
    let playlists: PlaylistSummary[] = [];
    for (const [sourceId, source] of this.sources) {
      try {
        const sourcePlaylists = await source.getPlaylists();
        playlists = playlists.concat(
          sourcePlaylists.map((p) => ({ ...p, source: sourceId }))
        );
      } catch (error) {
        console.error(`Failed to get playlists for source ${sourceId}`, error);
      }
    }
    if (playlists.length === 0) {
      console.error('No playlists found');
      return Promise.reject('No playlists found');
    }
    return playlists;
  }

  public async getPlaylistById(
    playlistId: string,
    source: string
  ): Promise<Playlist> {
    await this.initializationPromise;

    const sourceInstance = this.sources.get(source);
    if (!sourceInstance) {
      return Promise.reject('Source not found');
    }
    return sourceInstance.getPlaylistById(playlistId);
  }

  // Lyrics handling
  public async getLyrics(trackId: string): Promise<Lyrics> {
    await this.initializationPromise;

    const source = this.getActiveSource();
    if (!source) {
      return { error: 'No source playing', source: 'source-manager' };
    }

    const lyrics = await source.getLyrics(trackId);
    console.log(
      'shouldFetchBackupLyrics',
      this.shouldFetchBackupLyrics(lyrics),
      this.currentTrack
    );
    if (this.shouldFetchBackupLyrics(lyrics) && this.currentTrack) {
      const backupLyrics = await getLRCLIBLyrics(
        this.currentTrack.title,
        this.currentTrack.artist,
        this.currentTrack.album || ''
      );
      console.log('backupLyrics', backupLyrics);
      if (!backupLyrics) {
        return lyrics;
      } else {
        return backupLyrics;
      }
    }

    return lyrics;
  }

  private shouldFetchBackupLyrics(lyrics: Lyrics): boolean {
    return (
      ('error' in lyrics && lyrics.error === 'No lyrics found') ||
      ('synced' in lyrics && lyrics.synced === false)
    );
  }

  public async search(query: string): Promise<SearchResult> {
    await this.initializationPromise;

    const sourcePromises = Array.from(this.sources.entries()).map(
      async ([sourceId, source]) => {
        try {
          const results = await source.search(query);
          const songs = results.songs.map((s: Song) => ({
            ...s,
            source: sourceId,
            availableSources: [sourceId],
          }));
          const albums = results.albums.map((a: Album) => ({
            ...a,
            source: sourceId,
            availableSources: [sourceId],
          }));
          const artists = results.artists.map((a: Artist) => ({
            ...a,
            source: sourceId,
            availableSources: [sourceId],
          }));
          return { songs, albums, artists };
        } catch (error) {
          console.error(`Search failed for source ${sourceId}:`, error);
          return { songs: [], albums: [], artists: [] };
        }
      }
    );

    const sourceResults = await Promise.all(sourcePromises);
    const allSongs = sourceResults.flatMap((result) => result.songs);
    const allAlbums = sourceResults.flatMap((result) => result.albums);
    const allArtists = sourceResults.flatMap((result) => result.artists);

    // Deduplicate Songs
    const songMap = new Map<string, ExtendedSong>();
    let songIndex = 0;
    const getSongKey = (s: Song) =>
      `${s.title.toLowerCase()}|${s.artist.toLowerCase()}`;
    for (const s of allSongs) {
      const key = getSongKey(s);
      if (songMap.has(key)) {
        const existing = songMap.get(key)!;
        // Merge availableSources by creating a unique set
        existing.availableSources = Array.from(
          new Set([...existing.availableSources, s.source])
        );
      } else {
        songMap.set(key, {
          ...s,
          availableSources: [s.source],
          _firstAppearanceIndex: songIndex,
        });
      }
      songIndex++;
    }
    const mergedSongs = Array.from(songMap.values())
      .sort((a, b) => a._firstAppearanceIndex - b._firstAppearanceIndex)
      .map(({ _firstAppearanceIndex, ...rest }) => rest);

    // Deduplicate Albums
    const albumMap = new Map<string, ExtendedAlbum>();
    let albumIndex = 0;
    const getAlbumKey = (a: Album) => a.title.toLowerCase();
    for (const a of allAlbums) {
      const key = getAlbumKey(a);
      if (albumMap.has(key)) {
        const existing = albumMap.get(key)!;
        existing.availableSources = Array.from(
          new Set([...existing.availableSources, a.source])
        );
      } else {
        albumMap.set(key, {
          ...a,
          availableSources: [a.source],
          _firstAppearanceIndex: albumIndex,
        });
      }
      albumIndex++;
    }
    const mergedAlbums = Array.from(albumMap.values())
      .sort((a, b) => a._firstAppearanceIndex - b._firstAppearanceIndex)
      .map(({ _firstAppearanceIndex, ...rest }) => rest);

    // Deduplicate Artists
    const artistMap = new Map<string, ExtendedArtist>();
    let artistIndex = 0;
    const getArtistKey = (a: Artist) => a.name.toLowerCase();
    for (const a of allArtists) {
      const key = getArtistKey(a);
      if (artistMap.has(key)) {
        const existing = artistMap.get(key)!;
        existing.availableSources = Array.from(
          new Set([...existing.availableSources, a.source])
        );
      } else {
        artistMap.set(key, {
          ...a,
          availableSources: [a.source],
          _firstAppearanceIndex: artistIndex,
        });
      }
      artistIndex++;
    }
    const mergedArtists = Array.from(artistMap.values())
      .sort((a, b) => a._firstAppearanceIndex - b._firstAppearanceIndex)
      .map(({ _firstAppearanceIndex, ...rest }) => rest);

    return {
      songs: mergedSongs,
      albums: mergedAlbums,
      artists: mergedArtists,
    };
  }

  /**
   * Retrieves artist information by their unique ID from a specified source.
   *
   * @param artistId - The unique identifier of the artist to retrieve.
   * @param source - The name of the source from which to fetch the artist data.
   * @returns A promise that resolves to an {@link ArtistData} containing the artist's information.
   * @throws Will reject the promise if the specified source is not found.
   */
  public async getArtistById(
    artistId: string,
    source: string
  ): Promise<ArtistData> {
    await this.initializationPromise;
    const sourceInstance = this.sources.get(source);
    if (!sourceInstance) {
      return Promise.reject('Source not found');
    }
    return sourceInstance.getArtistById(artistId);
  }

  // Cleanup
  public destroy(): void {
    this.stopTimeUpdates();
    this.timeUpdateListeners.clear();
    this.playPauseListeners.clear();
  }
}
