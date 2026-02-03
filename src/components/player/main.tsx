'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { ChevronUp, ListStart, Volume1 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CrossPlatformStorage } from '@/lib/storage/cross-platform-storage';
import { useQueueStore } from '@/lib/queue';
import { usePlayerStore, useUiStore } from '@/lib/state';
import Controls from '@/components/player/controls';
import { useSourceManager, useSourcePlayPause, useCurrentSong, useQueueActions } from '@/lib/hooks';

const localStorage = new CrossPlatformStorage();

function SearchParamsWrapper({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  return children;
}

export function Player() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchParamsWrapper>
        <PlayerContent />
      </SearchParamsWrapper>
    </Suspense>
  );
}

export function PlayerContent() {
  const sourceManager = useSourceManager();
  const setFullScreen = useUiStore((state) => state.toggleFullScreenPlayer);
  const fullScreen = useUiStore((state) => state.fullScreenPlayer);
  const searchParams = useSearchParams();
  const setAudioRef = usePlayerStore((state) => state.setRef);
  const audioRef = useRef<HTMLAudioElement>(null);
  const router = useRouter();

  const { songData, currentSong: currentlyPlaying, repeat, playing } = useCurrentSong();
  const { skip, playPrevious, setPlaying } = useQueueActions();
  const sourcePlayState = useSourcePlayPause();
  const songs = useQueueStore((state) => state.queue.songs);

  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);

  useEffect(() => {
    setTimeout(() => {
      setInitialLoad(false);
    }, 5000);
  }, []);

  // Sync source state to store
  useEffect(() => {
    setPlaying(sourcePlayState);
  }, [sourcePlayState, setPlaying]);

  useEffect(() => {
    if (playing === 'ended') {
      skip();
    }
  }, [playing, skip]);

  const updateSong = async () => {
    await sourceManager.playSong(songData);
    if (!initialLoad) {
      sourceManager.play();
    }
    setInitialLoad(false);
    sourceManager.setRepeat(repeat == 2 ? true : false);
  };

  useEffect(() => {
    updateSong();
  }, [songData]);

  useEffect(() => {
    if (searchParams.get('playing')) {
      console.log('Loading song:', searchParams.get('playing'));
    }
  }, [searchParams]);

  const updateParams = () => {
    if (songData) {
      //      router.replace(`?${new URLSearchParams({ playing: songData.id })}`);
    }
  };

  useEffect(() => {
    updateParams();
    updateMediaSession();
  }, [songData]);

  const updateMediaSession = () => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: songData?.title,
        artist: songData?.artist,
        album: songData?.album,
        artwork: [
          {
            src: imageUrl || '/',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        sourceManager.play();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        sourceManager.pause();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (sourceManager.getPosition() > 5) {
          sourceManager.seek(0);
          sourceManager.play();
        } else {
          playPrevious();
        }
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        skip();
      });
    }
  };

  if (songData == undefined) {
    return (
      <div className='sticky hidden h-[75px] w-screen flex-shrink-0 flex-grow-0 md:flex'>
        <div className='flex h-full items-center justify-center'>
          <div className='h-full p-3'>
            <div className='aspect-square h-full rounded-lg bg-background'></div>
          </div>
          <div className=''>
            <p>Not Playing</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='relative'>
      {!fullScreen && (
        <MobilePlayer
          currentlyPlaying={currentlyPlaying}
          setFullScreen={setFullScreen}
          imageUrl={songData.imageUrl}
          playing={playing === 'playing' ? true : false}
        />
      )}
      <div className='sticky flex h-[75px] w-screen flex-shrink-0 flex-grow-0 justify-between max-md:hidden'>
        <div className='absolute flex h-full items-center justify-center'>
          <div className='group h-full'>
            <div className='absolute z-50 aspect-square h-full rounded-lg p-3'>
              <button
                className='invisible z-50 flex aspect-square h-full items-center justify-center rounded-lg group-hover:visible'
                onClick={() => setFullScreen()}
              >
                <ChevronUp
                  className='text-slate-300 opacity-0 transition-all duration-700 group-hover:mb-4 group-hover:opacity-70'
                  size={64}
                />
              </button>
            </div>
            <div className='h-full p-3'>
              {songData.imageUrl ? (
                <img
                  src={songData.imageUrl}
                  alt='Album Cover'
                  className='h-full rounded-lg transition-all duration-700 group-hover:blur-xs'
                />
              ) : (
                <div className='aspect-square h-full rounded-lg bg-background transition-all duration-700 group-hover:blur-xs'></div>
              )}
            </div>
          </div>
          <div className=''>
            <Link href={`/home/track/${songData.id}`}>
              <p>{songData.title}</p>{' '}
            </Link>
            <div className='flex flex-row'>
              <Link href={`/home/album/${songData.album}`}>
                <p className='pr-1 text-sm text-slate-500 hover:underline'>
                  {songData.album}
                </p>
              </Link>
              <p className='pr-1 text-sm text-slate-500'>-</p>
              <Link href={`/home/artist/${songData.artist}`}>
                <p className='text-sm text-slate-500 hover:underline'>
                  {songData.artist}
                </p>
              </Link>
            </div>
            <div className='flex'>
              <HoverCard>
                <HoverCardTrigger>
                  <p className='border-1 rounded-md border pl-1 pr-1 text-sm text-slate-300'>
                    {/* {songData.suffix.toUpperCase()} */}
                  </p>
                </HoverCardTrigger>
                <HoverCardContent>
                  <p className='text-slate-300'>
                    {/* {songData.suffix.toUpperCase()} ({songData.bitRate} Kbps -{' '} */}
                    {/* {songData.samplingRate / 1000} Mhz) */}
                  </p>
                </HoverCardContent>
              </HoverCard>
            </div>
          </div>
        </div>
        <div></div>
        <div className='hidden md:flex'>
          <Controls songData={songData} />
        </div>
        <div className='hidden md:flex'>
          <RightControls audioRef={audioRef} />
        </div>
      </div>
    </div>
  );
}

function RightControls({ audioRef }: { audioRef: any }) {
  const [volume, setVolume] = useState<number>(100);
  const sourceManager = useSourceManager();

  const onChange = (e: number[]) => {
    const volumeValue = e[0];
    setVolume(volumeValue / 10);
    localStorage.setItem('volume', volumeValue.toString());
    sourceManager.setVolume(volumeValue / 1000);
  };

  useEffect(() => {
    updateVolume();
  }, [audioRef.current]);

  async function updateVolume() {
    if (audioRef.current) {
      audioRef.current.volume =
        (await localStorage.getItem('volume')) !== null
          ? parseInt((await localStorage.getItem('volume')) || '100') / 1000
          : 1;
      setVolume(
        (await localStorage.getItem('volume')) !== null
          ? parseInt((await localStorage.getItem('volume')) || '100') / 10
          : 100
      );
      console.log(
        (await localStorage.getItem('volume')) !== null
          ? parseInt((await localStorage.getItem('volume')) || '100') / 1000
          : 1
      );
    }
  }

  return (
    <div className='absolute right-4 z-20 mb-4 flex h-full flex-row items-center justify-center'>
      <Volume1 strokeWidth={3} absoluteStrokeWidth />
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Slider
              defaultValue={[]}
              max={1000}
              step={1}
              className='ml-2 mr-2 w-36'
              onValueChange={(e: number[]) => onChange(e)}
              value={[volume * 10]}
            />
          </TooltipTrigger>
          <TooltipContent sideOffset={4}>{Math.round(volume)}%</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ListStart strokeWidth={3} absoluteStrokeWidth />
    </div>
  );
}

import { useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from './ignore-safe-area.module.css';

function MobilePlayer({
  currentlyPlaying,
  setFullScreen,
  imageUrl,
  playing,
}: {
  currentlyPlaying: any;
  setFullScreen: any;
  playing: boolean;
  imageUrl: string | undefined;
}) {
  const progressRef = useRef<HTMLDivElement>(null);
  const progressContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = usePlayerStore((state) => state.ref);
  const animationFrameRef = useRef<number>();

  const updateProgress = useCallback(() => {
    if (!progressRef.current || !audioRef?.current) return;

    // Check if audio is loaded and has duration
    if (isNaN(audioRef.current.duration)) {
      progressRef.current.style.transform = 'scaleX(0)';
      return;
    }

    const progress =
      audioRef.current.currentTime / audioRef.current.duration || 0;
    const boundedProgress = Math.min(Math.max(progress, 0), 1);

    progressRef.current.style.transform = `scaleX(${boundedProgress})`;

    if (Math.abs(boundedProgress - 1) < 0.001) {
      progressRef.current.style.borderRadius = '24px';
    } else {
      progressRef.current.style.borderRadius = '24px 0 0 24px';
    }

    if (!audioRef.current.paused) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  // Reset on song change
  useEffect(() => {
    if (!progressRef.current || !audioRef?.current) return;

    const handleSourceChange = () => {
      if (progressRef.current) {
        progressRef.current.style.transform = 'scaleX(0)';
        progressRef.current.style.borderRadius = '24px 0 0 24px';
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Start new animation if playing
      if (!audioRef.current?.paused) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    const audio = audioRef.current;
    audio.addEventListener('loadstart', handleSourceChange);

    return () => {
      audio.removeEventListener('loadstart', handleSourceChange);
    };
  }, [updateProgress]);

  // Handle playback state changes
  useEffect(() => {
    if (!audioRef?.current) return;

    const handlePlay = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    };

    const handlePause = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    const handleTimeUpdate = () => {
      if (!animationFrameRef.current) {
        updateProgress();
      }
    };

    const handleSeeking = () => {
      updateProgress();
    };

    const audio = audioRef.current;
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handlePlay);
    audio.addEventListener('seeking', handleSeeking);
    audio.addEventListener('seeked', handleSeeking);

    // Initial state
    if (!audio.paused) {
      handlePlay();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('seeking', handleSeeking);
      audio.removeEventListener('seeked', handleSeeking);
    };
  }, [updateProgress]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const songData = useQueueStore((state) => state.queue.currentSong?.track);
  const skip = useQueueStore((state) => state.skip);
  const playPrevious = useQueueStore((state) => state.playPrevious);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  };

  function handlePrevious() {
    if (audioRef.current) {
      if (audioRef.current.currentTime > 5) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      } else {
        playPrevious();
      }
    }
  }

  const handleFullScreen = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON') return;
    setFullScreen(true);
  };

  return (
    <div
      className={cn(
        'bg-gray absolute z-50 flex aspect-square h-[10vh] w-full animate-[fade-in] items-center justify-center px-[5vw] py-[2vh] opacity-100 duration-100 ease-in-out bottom-safe-or-0 md:hidden'
      )}
    >
      <div
        ref={progressContainerRef}
        className='absolute z-50 h-[6vh] w-[90vw] overflow-hidden rounded-3xl bg-gray-800/60 backdrop-blur-md'
      >
        <div
          ref={progressRef}
          className='h-full w-full origin-left bg-gray-700/40'
          style={{
            borderRadius: '24px 0 0 24px',
            transform: 'scaleX(0)',
            transition: 'transform 50ms linear, border-radius 150ms ease',
          }}
        ></div>
      </div>
      <div
        className='z-50 flex h-[6vh] w-[90vw] items-center justify-between'
        onClick={handleFullScreen}
      >
        <div className='flex h-full w-full items-center p-4'>
          {imageUrl ? (
            <img
              src={songData?.imageUrl}
              className='relative z-[55] h-[4vh] rounded-lg border border-border object-cover'
              alt='Album art'
            />
          ) : (
            <div className='h-full w-full bg-gray-800'></div>
          )}
          <div className='ml-4 flex flex-col'>
            <h1 className='z-[55] line-clamp-1 text-lg font-bold text-white'>
              {songData?.title}
            </h1>
          </div>
        </div>
        <div className='z-[60] mr-10 flex w-full items-center justify-end'>
          <button onClick={() => handlePrevious()}>
            <ControlButton icon='previous' />
          </button>

          <button className='' onClick={handlePlayPause}>
            {!playing ? <PlayIcon /> : <PauseIcon />}
          </button>

          <button onClick={() => skip()}>
            <ControlButton icon='next' />
          </button>
        </div>
      </div>
    </div>
  );
}

interface ControlButtonProps {
  icon: 'previous' | 'next';
  onClick?: () => void;
}

const ControlButton: React.FC<ControlButtonProps> = ({ icon }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='currentColor'
    className='size-[30px]'
  >
    <path
      d={
        icon === 'next'
          ? 'M5.055 7.06C3.805 6.347 2.25 7.25 2.25 8.69v8.122c0 1.44 1.555 2.343 2.805 1.628L12 14.471v2.34c0 1.44 1.555 2.343 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256l-7.108-4.061C13.555 6.346 12 7.249 12 8.689v2.34L5.055 7.061Z'
          : 'M9.195 18.44c1.25.714 2.805-.189 2.805-1.629v-2.34l6.945 3.968c1.25.715 2.805-.188 2.805-1.628V8.69c0-1.44-1.555-2.343-2.805-1.628L12 11.029v-2.34c0-1.44-1.555-2.343-2.805-1.628l-7.108 4.061c-1.26.72-1.26 2.536 0 3.256l7.108 4.061Z'
      }
    />
  </svg>
);

const PlayIcon: React.FC = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='currentColor'
    className='size-[30px]'
  >
    <path
      fillRule='evenodd'
      d='M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z'
      clipRule='evenodd'
    />
  </svg>
);

const PauseIcon: React.FC = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='currentColor'
    className='size-[30px]'
  >
    <path
      fillRule='evenodd'
      d='M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z'
      clipRule='evenodd'
    />
  </svg>
);
