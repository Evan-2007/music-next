import { useState, useEffect, useCallback } from 'react';
import { SourceManager } from '@/lib/sources/source-manager';

/**
 * Subscribe to SourceManager time updates.
 * Returns current position and duration.
 */
export function useSourceTimeUpdate() {
  const [position, setPosition] = useState(() => {
    const sourceManager = SourceManager.getInstance();
    return sourceManager.getPosition() ?? 0;
  });
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const sourceManager = SourceManager.getInstance();
    // Sync initial position
    const pos = sourceManager.getPosition();
    if (pos !== null) setPosition(pos);

    const cleanup = sourceManager.onTimeUpdate((pos, dur) => {
      setPosition(pos);
      setDuration(dur);
    });
    return cleanup;
  }, []);

  return { position, duration };
}

/**
 * Subscribe to SourceManager play/pause updates.
 * Returns current playing state.
 */
export function useSourcePlayPause() {
  const [playing, setPlaying] = useState<'playing' | 'paused' | 'ended'>(() => {
    // Get initial state from SourceManager
    const sourceManager = SourceManager.getInstance();
    return sourceManager.getPlaying();
  });

  useEffect(() => {
    const sourceManager = SourceManager.getInstance();
    // Sync initial state in case it changed before subscription
    setPlaying(sourceManager.getPlaying());

    const cleanup = sourceManager.onPlayPause((state) => {
      setPlaying(state);
    });
    return cleanup;
  }, []);

  return playing;
}

/**
 * Combined hook for both time updates and play/pause state.
 * Useful when you need both in the same component.
 */
export function useSourceEvents() {
  const [position, setPosition] = useState(() => {
    const sourceManager = SourceManager.getInstance();
    return sourceManager.getPosition() ?? 0;
  });
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState<'playing' | 'paused' | 'ended'>(() => {
    const sourceManager = SourceManager.getInstance();
    return sourceManager.getPlaying();
  });

  useEffect(() => {
    const sourceManager = SourceManager.getInstance();
    // Sync initial states
    setPlaying(sourceManager.getPlaying());
    const pos = sourceManager.getPosition();
    if (pos !== null) setPosition(pos);

    const cleanupTime = sourceManager.onTimeUpdate((pos, dur) => {
      setPosition(pos);
      setDuration(dur);
    });

    const cleanupPlayPause = sourceManager.onPlayPause((state) => {
      setPlaying(state);
    });

    return () => {
      cleanupTime();
      cleanupPlayPause();
    };
  }, []);

  return { position, duration, playing };
}

/**
 * Hook providing common playback control methods.
 */
export function useSourceControls() {
  const sourceManager = SourceManager.getInstance();

  const play = useCallback(() => sourceManager.play(), [sourceManager]);
  const pause = useCallback(() => sourceManager.pause(), [sourceManager]);
  const seek = useCallback(
    (time: number) => sourceManager.seek(time),
    [sourceManager]
  );
  const setVolume = useCallback(
    (volume: number) => sourceManager.setVolume(volume),
    [sourceManager]
  );
  const setRepeat = useCallback(
    (repeat: boolean) => sourceManager.setRepeat(repeat),
    [sourceManager]
  );
  const getPosition = useCallback(
    () => sourceManager.getPosition(),
    [sourceManager]
  );
  const formatTime = useCallback(
    (time: number) => sourceManager.formatTime(time),
    [sourceManager]
  );

  return { play, pause, seek, setVolume, setRepeat, getPosition, formatTime };
}
