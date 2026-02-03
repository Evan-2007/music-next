import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SourceManager } from '@/lib/sources/source-manager';
import {
  AlbumData,
  Playlist,
  SearchResult,
  NormalLyrics,
  ArtistData,
} from '@/lib/sources/types';

interface UseSourceDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Generic hook for fetching data from SourceManager by id and source.
 */
export function useSourceData<T>(
  fetcher: (
    sourceManager: SourceManager,
    id: string,
    source: string
  ) => Promise<T>
): UseSourceDataResult<T> {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const source = searchParams.get('source');

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id || !source) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const sourceManager = SourceManager.getInstance();
    fetcher(sourceManager, id, source)
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [id, source]);

  return { data, loading, error };
}

/**
 * Hook for fetching album data.
 */
export function useAlbumData() {
  return useSourceData<AlbumData>((sm, id, source) =>
    sm.getAlbumData(id, source)
  );
}

/**
 * Hook for fetching playlist data.
 */
export function usePlaylistData() {
  return useSourceData<Playlist>((sm, id, source) =>
    sm.getPlaylistById(id, source)
  );
}

/**
 * Hook for fetching artist data.
 */
export function useArtistData() {
  return useSourceData<ArtistData>((sm, id, source) =>
    sm.getArtistById(id, source)
  );
}

/**
 * Hook for searching across sources.
 */
export function useSourceSearch(query: string | null) {
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const sourceManager = SourceManager.getInstance();
    sourceManager
      .search(query)
      .then((result) => {
        setResults(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [query]);

  return { results, loading, error };
}

interface LyricsResult {
  lyrics: NormalLyrics['lines'] | null;
  synced: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for fetching lyrics for a track.
 */
export function useLyrics(trackId: string | undefined): LyricsResult {
  const [lyrics, setLyrics] = useState<NormalLyrics['lines'] | null>(null);
  const [synced, setSynced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackId) {
      setLyrics(null);
      setSynced(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const sourceManager = SourceManager.getInstance();
    sourceManager
      .getLyrics(trackId)
      .then((response) => {
        if ('error' in response && response.error) {
          setError(response.error);
          setLyrics(null);
        } else if ('lines' in response && 'synced' in response) {
          setLyrics(response.lines);
          setSynced(response.synced);
          setError(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [trackId]);

  return { lyrics, synced, loading, error };
}
