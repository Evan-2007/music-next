import { SourceInterface } from '@/lib/sources/source-interface';
import {
  Song,
  Lyrics,
  SearchResult,
  AlbumSummary,
  AlbumData,
  Playlist,
  PlaylistSummary,
  ArtistData,
} from '@/lib/sources/types';
import { jwtDecode } from 'jwt-decode';
import { last } from 'lodash';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { ArtistResponse } from '@/types/artistResponse';

export class musicKit implements SourceInterface {
  private musicKitInstance: any = null;
  private initializationPromise: Promise<void> | null = null;
  private timeUpdateCallback:
    | ((currentTime: number, duration: number) => void)
    | null = null;
  private playPauseCallback:
    | ((playing: 'playing' | 'paused' | 'ended') => void)
    | null = null;

  private privilagedDeveloperToken: null | string = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializationPromise = this.initialize();
    }

    this.setUpPlayerEvents();
    this.setupPlayPauseEvents();
  }

  private async initialize(): Promise<void> {
    await this.checkMusicKit();
  }

  private async checkMusicKit(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutDuration = 10000;
      const retryInterval = 100;
      const startTime = Date.now();

      const checkStatus = () => {
        if (
          typeof window !== 'undefined' &&
          (window as any).musicKitStatus === 'ready'
        ) {
          this.musicKitInstance = (window as any).MusicKit.getInstance();
          console.log('MusicKit configured');
          resolve();
        } else if (Date.now() - startTime >= timeoutDuration) {
          console.error('MusicKit not configured');
          reject(new Error('MusicKit not configured within timeout'));
        } else {
          setTimeout(checkStatus, retryInterval);
        }
      };

      checkStatus();
    });
  }

  async play(): Promise<void> {
    await this.initializationPromise;

    await this.musicKitInstance.play();
  }
  async pause(): Promise<void> {
    await this.initializationPromise;
    console.log('Pausing song using web');
    if (!this.musicKitInstance) {
      console.error('MusicKit not initialized');
      return;
    }

    this.musicKitInstance.pause();
  }
  async playSong(trackId: string): Promise<void> {
    await this.initializationPromise;
    console.log('Playing song using web', trackId);
    if (!this.musicKitInstance) {
      console.error('MusicKit not initialized');
      return;
    }

    await this.musicKitInstance.setQueue({
      song: trackId,
    });

    // await this.musicKitInstance.play();
  }
  getAllPlaylists(): void {
    throw new Error('Method not implemented.');
  }
  getQueue(): void {
    throw new Error('Method not implemented.');
  }
  getLyrics(): Promise<Lyrics> {
    return {
      //@ts-ignore
      error: 'No lyrics found',
      source: 'musicKit',
    };
  }

  public onTimeUpdate(
    callback: (currentTime: number, duration: number) => void
  ): void {
    this.timeUpdateCallback = callback;
  }

  private async setUpPlayerEvents() {
    await this.initializationPromise;
    this.musicKitInstance.addEventListener(
      'playbackTimeDidChange',
      (data: {
        currentPlaybackDuration: number;
        currentPlaybackTime: number;
        curentPlaybackTimeRemaining: number;
      }) => {
        if (this.timeUpdateCallback) {
          this.timeUpdateCallback(
            data.currentPlaybackTime,
            data.currentPlaybackDuration
          );
        }
      }
    );
  }

  public onPlayPause(
    callback: (playing: 'playing' | 'paused' | 'ended') => void
  ): void {
    this.playPauseCallback = callback;
  }

  private async setupPlayPauseEvents() {
    await this.initializationPromise;
    this.musicKitInstance.addEventListener(
      'playbackStateDidChange',
      (data: { state: number }) => {
        console.log('Play state change', data);
        if (this.playPauseCallback) {
          if (data.state === 2) {
            this.playPauseCallback('playing');
          } else if (data.state === 3) {
            this.playPauseCallback('paused');
          } else if (data.state === 10) {
            this.playPauseCallback('ended');
          } else {
            //console.log('No callback set');
          }
        }
      }
    );
  }
  async seek(position: number): Promise<void> {
    await this.initializationPromise;
    if (!this.musicKitInstance) {
      console.error('MusicKit not initialized');
      return;
    }

    this.musicKitInstance.seekToTime(position);
  }

  async setRepeat(repeat: boolean): Promise<void> {
    await this.initializationPromise;
    if (!this.musicKitInstance) {
      console.error('MusicKit not initialized');
      return;
    }

    this.musicKitInstance.repeatMode = repeat ? 1 : 0;
  }
  async setVolume(volume: number): Promise<void> {
    await this.initializationPromise;
    if (!this.musicKitInstance) {
      console.error('MusicKit not initialized');
      return;
    }

    this.musicKitInstance.volume = volume;
  }
  getSongData(): Promise<Song> {
    throw new Error('Method not implemented.');
  }

  async getAlbumData(albumId: string, source: string): Promise<AlbumData> {
    await this.initializationPromise;

    const result = await this.musicKitInstance.api.music(
      `/v1/catalog/{{storefrontId}}/albums/${albumId}`
    );
    if (!result || !result.data) {
      console.error('Failed to fetch album data');
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
    const albumData = await result.data.data[0];
    console.log('Album data fetched from MusicKit:', albumData);

    let formatedTracks: Song[] = [];

    if (albumData.relationships && albumData.relationships.tracks) {
      formatedTracks = albumData.relationships.tracks.data.map(
        (track: any) => ({
          id: track.id,
          title: track.attributes.name,
          artist: track.attributes.artistName,
          album: track.attributes.albumName || albumData.attributes.name,
          duration: track.attributes.durationInMillis || 0,
          //       quality: track.attributes.audioTraits[0],
          source: 'musicKit',
          availableSources: ['musicKit'],
          imageUrl: (albumData.attributes.artwork.url ?? '').replace(
            '{w}x{h}',
            '900x900'
          ),
          releaseDate: albumData.attributes.releaseDate ?? '',
        })
      );
    }

    return {
      id: albumData.id,
      source: 'musicKit',
      releaseDate: albumData.attributes.releaseDate || '',
      artWork: {
        type: 'apple',
        url:
          albumData.attributes.artwork.url.replace('{w}x{h}', '900x900') || '',
        width: albumData.attributes.artwork.width || 0,
        height: albumData.attributes.artwork.height || 0,
        textColor1: albumData.attributes.artwork.textColor1 || '',
        textColor2: albumData.attributes.artwork.textColor2 || '',
        textColor3: albumData.attributes.artwork.textColor3 || '',
        textColor4: albumData.attributes.artwork.textColor4 || '',
        bgColor: albumData.attributes.artwork.bgColor || '',
        hasP3: albumData.attributes.artwork.hasP3 || false,
      },
      name: albumData.attributes.name || 'Album Name',
      artist: albumData.attributes.artistName || 'Album Artist',
      isSingle: albumData.attributes.isSingle || false,
      editorialNotes: albumData.attributes.editorialNotes,
      genres: albumData.attributes.genreNames || [],
      tracks: formatedTracks,
    };
  }

  async getPlaylists(): Promise<PlaylistSummary[]> {
    await this.initializationPromise;
    if (!this.musicKitInstance) {
      console.error('MusicKit not initialized');
      return Promise.reject('MusicKit not initialized');
    }
    const result = await this.musicKitInstance.api.music(
      '/v1/me/library/playlists'
    );
    if (!result || !result.data) {
      return Promise.reject('Failed to fetch playlists');
    }
    console.log(result.data);
    const playlists = result.data.data.map((playlist: any) => ({
      id: playlist.id,
      name: playlist.attributes.name,
      imageUrl: playlist.attributes.artwork
        ? playlist.attributes.artwork.url.replace('{w}x{h}', '900x900')
        : undefined,
      source: 'musicKit',
      lastModified: playlist.attributes.lastModifiedDate,
      canEdit: playlist.attributes.canEdit,
      isPublic: playlist.attributes.isPublic,
      isLibrary: playlist.attributes.playParams.isLibrary,
      dateAdded: playlist.attributes.dateAdded,
      type: playlist.type,
    }));
    return playlists;
  }

  async getPlaylistById(playlistId: string): Promise<Playlist> {
    await this.initializationPromise;
    if (!this.musicKitInstance) {
      console.error('MusicKit not initialized');
      return Promise.reject('MusicKit not initialized');
    }
    const params = {
      include: 'tracks',
    };
    const result = await this.musicKitInstance.api.music(
      `/v1/me/library/playlists/${playlistId}`,
      params
    );
    if (!result || !result.data) {
      return Promise.reject('Failed to fetch playlist');
    }

    const playlist = result.data.data[0];
    const tracks = playlist.relationships.tracks.data.map((track: any) => ({
      id: track.id,
      title: track.attributes.name,
      artist: track.attributes.artistName,
      album: track.attributes.albumName,
      duration: track.attributes.durationInMillis,
      quality: 'lossless',
      source: 'musicKit',
      availableSources: ['musicKit'],
      imageUrl: track.attributes.artwork.url.replace('{w}x{h}', '900x900'),
      releaseDate: track.attributes.releaseDate,
    }));

    return {
      id: playlist.id,
      name: playlist.attributes.name,
      imageUrl: playlist.attributes.artwork.url.replace('{w}x{h}', '900x900'),
      source: 'musicKit',
      lastModified: playlist.attributes.lastModifiedDate,
      canEdit: playlist.attributes.canEdit,
      isPublic: playlist.attributes.isPublic,
      type: playlist.type,
      isLibrary: playlist.attributes.playParams.isLibrary,
      dateAdded: playlist.attributes.dateAdded,
      tracks: playlist.relationships.tracks ? tracks : undefined,
    };
  }

  async getArtistById(artistId: string): Promise<ArtistData> {
    await this.initializationPromise;
    if (!this.musicKitInstance) {
      console.error('MusicKit not initialized');
      return Promise.reject('MusicKit not initialized');
    }

    if (!window.isTauri) {
      // Standard Apple Music API (appleMusic1)
      const artist = await this.musicKitInstance.api.music(
        `/v1/catalog/{{storefrontId}}/artists/${artistId}?include=albums,songs,genres,music-videos`
      );
      const data = artist.data.data[0];
      return this.normalizeAppleMusic1(data);
    } else {
      // Extended Apple Music API via Tauri (appleMusic2)
      const MediaUserToken = localStorage.getItem(
        'music.q222xnn59b.media-user-token'
      );
      const token = localStorage.getItem('music.apple.com:music-token');
      if (!token) {
        throw new Error('No developer token found');
      }
      const url = `https://amp-api.music.apple.com/v1/catalog/us/artists/${artistId}?art%5Burl%5D=c%2Cf&extend=artistBio%2CbornOrFormed%2CeditorialArtwork%2CeditorialVideo%2CextendedAssetUrls%2Chero%2CisGroup%2Corigin%2CplainEditorialNotes%2CseoDescription%2CseoTitle&extend%5Bplaylists%5D=trackCount&format%5Bresources%5D=map&include=record-labels%2Cartists%2Cpersons%2Cbands&include%5Bmusic-videos%5D=artists&include%5Bsongs%5D=artists%2Calbums&l=en-US&limit%5Bartists%3Atop-songs%5D=20&meta%5Balbums%3Atracks%5D=popularity&omit%5Bresource%5D=autos&platform=web&views=appears-on-albums%2Ccompilation-albums%2Cfeatured-albums%2Cfeatured-on-albums%2Cfeatured-release%2Cfull-albums%2Clatest-release%2Clive-albums%2Cmore-to-hear%2Cmore-to-see%2Cmusic-videos%2Cplaylists%2Cradio-shows%2Csimilar-artists%2Csingles%2Ctop-songs`;
      const response = await tauriFetch(url, {
        method: 'GET',
        mode: 'no-cors',
        headers: {
          Authorization: `Bearer ${token}`,
          Origin: 'https://music.apple.com',
          'Media-User-Token': MediaUserToken || '',
        },
      });

      const apiData: ArtistResponse = {
        data: await response.json(),
        type: 'appleMusic2',
      };
      return this.normalizeAppleMusic2(apiData.data, artistId);
    }
  }

  private normalizeAppleMusic1(data: any): ArtistData {
    const attrs = data.attributes;
    const artworkUrl = attrs?.artwork?.url
      ?.replace('{w}', '500')
      .replace('{h}', '500')
      .replace('{c}', 'cc')
      .replace('{f}', 'webp') || '';

    const albums: AlbumSummary[] = (data.relationships?.albums?.data || []).map(
      (album: any) => ({
        id: album.id,
        title: album.attributes?.name || '',
        artist: album.attributes?.artistName || '',
        imageUrl: album.attributes?.artwork?.url
          ?.replace('{w}', '500')
          .replace('{h}', '500')
          .replace('{c}', 'cc')
          .replace('{f}', 'webp') || '',
        releaseDate: album.attributes?.releaseDate || '',
        source: 'musicKit',
        availableSources: ['musicKit'],
        totalTracks: album.attributes?.trackCount || 0,
      })
    );

    const songs: Song[] = (data.relationships?.songs?.data || []).map(
      (song: any) => ({
        id: song.id,
        title: song.attributes?.name || '',
        artist: song.attributes?.artistName || '',
        album: song.attributes?.albumName || '',
        albumId: song.relationships?.albums?.data?.[0]?.id,
        duration: song.attributes?.durationInMillis || 0,
        source: 'musicKit',
        availableSources: ['musicKit'],
        imageUrl: song.attributes?.artwork?.url
          ?.replace('{w}', '500')
          .replace('{h}', '500')
          .replace('{c}', 'cc')
          .replace('{f}', 'webp') || '',
        releaseDate: song.attributes?.releaseDate || '',
      })
    );

    return {
      id: data.id,
      source: 'musicKit',
      name: attrs?.name || '',
      imageUrl: artworkUrl,
      genres: attrs?.genreNames,
      albums: albums.sort(
        (a, b) =>
          new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
      ),
      songs,
      artwork: attrs?.artwork
        ? {
            type: 'apple' as const,
            url: artworkUrl,
            width: attrs.artwork.width || 0,
            height: attrs.artwork.height || 0,
            textColor1: attrs.artwork.textColor1 || '',
            textColor2: attrs.artwork.textColor2 || '',
            textColor3: attrs.artwork.textColor3 || '',
            textColor4: attrs.artwork.textColor4 || '',
            bgColor: attrs.artwork.bgColor || '',
            hasP3: attrs.artwork.hasP3 || false,
          }
        : undefined,
    };
  }

  private normalizeAppleMusic2(data: any, artistId: string): ArtistData {
    const artist = data?.resources?.artists?.[artistId];
    const attrs = artist?.attributes;
    const artworkUrl = attrs?.artwork?.url
      ?.replace('{w}', '500')
      .replace('{h}', '500')
      .replace('{c}', 'cc')
      .replace('{f}', 'webp') || '';

    const albumsObj = data?.resources?.albums || {};
    const albums: AlbumSummary[] = Object.values(albumsObj).map(
      (album: any) => ({
        id: album.id,
        title: album.attributes?.name || '',
        artist: album.attributes?.artistName || '',
        imageUrl: album.attributes?.artwork?.url
          ?.replace('{w}', '500')
          .replace('{h}', '500')
          .replace('{c}', 'cc')
          .replace('{f}', 'webp') || '',
        releaseDate: album.attributes?.releaseDate
          ? String(album.attributes.releaseDate)
          : '',
        source: 'musicKit',
        availableSources: ['musicKit'],
        totalTracks: album.attributes?.trackCount || 0,
      })
    );

    const songsObj = data?.resources?.songs || {};
    const songs: Song[] = Object.values(songsObj).map((song: any) => ({
      id: song.id,
      title: song.attributes?.name || '',
      artist: song.attributes?.artistName || '',
      album: song.attributes?.albumName || '',
      albumId: song.relationships?.albums?.data?.[0]?.id,
      duration: song.attributes?.durationInMillis || 0,
      source: 'musicKit',
      availableSources: ['musicKit'],
      imageUrl: song.attributes?.artwork?.url
        ?.replace('{w}', '500')
        .replace('{h}', '500')
        .replace('{c}', 'cc')
        .replace('{f}', 'webp') || '',
      releaseDate: song.attributes?.releaseDate
        ? String(song.attributes.releaseDate)
        : '',
    }));

    const editorialVideo = attrs?.editorialVideo;

    return {
      id: artistId,
      source: 'musicKit',
      name: attrs?.name || '',
      imageUrl: artworkUrl,
      bio: attrs?.artistBio,
      genres: attrs?.genreNames,
      albums: albums.sort(
        (a, b) =>
          new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
      ),
      songs,
      artwork: attrs?.artwork
        ? {
            type: 'apple' as const,
            url: artworkUrl,
            width: attrs.artwork.width || 0,
            height: attrs.artwork.height || 0,
            textColor1: attrs.artwork.textColor1 || '',
            textColor2: attrs.artwork.textColor2 || '',
            textColor3: attrs.artwork.textColor3 || '',
            textColor4: attrs.artwork.textColor4 || '',
            bgColor: attrs.artwork.bgColor || '',
            hasP3: attrs.artwork.hasP3 || false,
          }
        : undefined,
      editorialVideo: editorialVideo
        ? {
            fullscreen:
              editorialVideo.motionArtistFullscreen16x9?.video ?? undefined,
            square: editorialVideo.motionArtistSquare1x1?.video ?? undefined,
            wide: editorialVideo.motionArtistWide16x9?.video ?? undefined,
          }
        : undefined,
    };
  }

  async search(query: string): Promise<SearchResult> {
    await this.initializationPromise;
    if (!this.musicKitInstance) {
      console.error('MusicKit not initialized');
      return {
        songs: [],
        albums: [],
        artists: [],
      };
    }
    const params = {
      term: query,
      limit: 25,
      types: ['songs', 'albums', 'artists'],
    };
    const result = await this.musicKitInstance.api.music(
      '/v1/catalog/{{storefrontId}}/search',
      params
    );

    const queryParameters = { l: 'en-us' };
    const me = await this.musicKitInstance.api.music(
      '/v1/me/recent/played',
      queryParameters
    );

    console.log(me);

    const response = await result;

    let songs = [];

    if (result.data.meta.results.order.includes('songs')) {
      songs = result.data.results.songs.data.map((song: any) => ({
        id: song.id,
        title: song.attributes.name,
        artist: song.attributes.artistName,
        album: song.attributes.albumName,
        duration: song.attributes.durationInMillis,
        quality: 'lossless',
        source: 'musicKit',
        availableSources: ['musicKit'],
        imageUrl: song.attributes.artwork.url.replace('{w}x{h}', '900x900'),
        releaseDate: song.attributes.releaseDate,
      }));
    }

    let albums = [];

    if (result.data.meta.results.order.includes('albums')) {
      albums = result.data.results.albums.data.map((album: any) => ({
        id: album.id,
        title: album.attributes.name,
        artist: album.attributes.artistName,
        imageUrl: album.attributes.artwork.url.replace('{w}x{h}', '900x900'),
        source: 'musicKit',
        availableSources: ['musicKit'],
        releaseDate: album.attributes.releaseDate,
        totalTracks: album.attributes.trackCount,
      }));
    }

    let artists = [];

    if (result.data.meta.results.order.includes('artists')) {
      artists = result.data.results.artists.data.map((artist: any) => ({
        id: artist.id,
        name: artist.attributes.name,
        imageUrl: artist.attributes.artwork.url.replace('{w}x{h}', '900x900'),
        source: 'musicKit',
        availableSources: ['musicKit'],
      }));
    }

    console.log(songs);

    const videos = await this.musicKitInstance.api.music(
      '/v1/catalog/{{storefrontId}}/search',
      params
    );

    const filteredAlbums = albums.filter(
      (album: AlbumSummary) => album.totalTracks > 1
    );
    return {
      songs,
      //videos: [],
      albums: filteredAlbums,
      artists,
    };
  }
}
