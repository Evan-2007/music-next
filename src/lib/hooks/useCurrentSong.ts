import { useQueueStore } from '@/lib/queue';

/**
 * Hook for accessing common current song state from the queue store.
 * Consolidates multiple useQueueStore selectors into a single hook.
 */
export function useCurrentSong() {
  const currentSong = useQueueStore((state) => state.queue.currentSong);
  const songData = useQueueStore((state) => state.queue.currentSong?.track);
  const playing = useQueueStore((state) => state.queue.playing);
  const repeat = useQueueStore((state) => state.queue.repeat);
  const shuffle = useQueueStore((state) => state.queue.shuffle);

  return {
    currentSong,
    songData,
    playing,
    repeat,
    shuffle,
  };
}

/**
 * Hook for accessing queue actions.
 */
export function useQueueActions() {
  const skip = useQueueStore((state) => state.skip);
  const playPrevious = useQueueStore((state) => state.playPrevious);
  const setPlaying = useQueueStore((state) => state.setPlaying);
  const setRepeat = useQueueStore((state) => state.setRepeat);
  const toggleShuffle = useQueueStore((state) => state.toggleShuffle);
  const play = useQueueStore((state) => state.play);
  const addToQueue = useQueueStore((state) => state.addToQueue);

  return {
    skip,
    playPrevious,
    setPlaying,
    setRepeat,
    toggleShuffle,
    play,
    addToQueue,
  };
}

/**
 * Combined hook for both song state and actions.
 */
export function usePlayer() {
  const songState = useCurrentSong();
  const actions = useQueueActions();

  return {
    ...songState,
    ...actions,
  };
}
