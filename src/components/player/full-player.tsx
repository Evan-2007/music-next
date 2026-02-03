'use client';
import { Song } from './types';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CrossPlatformStorage } from '@/lib/storage/cross-platform-storage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { extractColors } from 'extract-colors';
import Controls from './controls';
import Background from './background';
import { debounce } from 'lodash';
import { useCallback } from 'react';
import Lyrics from './lyrics/lyrics';
import Left from './full-left';
import { useQueueStore } from '@/lib/queue';
import { usePlayerStore, useUiStore } from '@/lib/state';
import { subsonicURL } from '@/lib/sources/navidrome';
import { useRouter } from 'next/navigation';
import styles from './ignore-safe-area.module.css';
import { cn } from '@/lib/utils';
import {
  MessageSquareQuote as LyricsIcon,
  Airplay,
  ListMusic,
} from 'lucide-react';
import {
  useSourceManager,
  useSourceEvents,
  useCurrentSong,
} from '@/lib/hooks';

import { useRef } from 'react';
interface FinalColor {
  hex: string;
  area: number;
}
export default function FullScreenPlayer({}: {}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [layout, setLayout] = useState<number>(1);

  const storage = new CrossPlatformStorage();

  const songData = useQueueStore((state) => state.queue.currentSong?.track);

  const audioRef = usePlayerStore((state) => state.ref);

  const router = useRouter();

  const fullScreen = useUiStore((state) => state.fullScreenPlayer);
  const setFullScreen = useUiStore((state) => state.toggleFullScreenPlayer);

  const container = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  function handleClose() {
    container.current?.classList.add('animate-[shrink-height_.3s_ease-out]');
    buttonsRef.current?.classList.remove('opacity-100');
    buttonsRef.current?.classList.add('opacity-0');
    setTimeout(() => {
      setFullScreen();
    }, 300);
  }

  useEffect(() => {
    if (container.current) {
      container.current.addEventListener;
    }
  }, [container]);

  useEffect(() => {
    if (!fullScreen) return;
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [fullScreen]);

  const [colors, setColors] = useState<FinalColor[]>([]);

  useEffect(() => {
    updateImageUrl();
  }, [songData]);

  const updateImageUrl = async () => {
    setImageUrl(songData?.imageUrl || null);
  };

  useEffect(() => {
    getCredentials();
  }, []);

  async function getCredentials() {
    const username = await storage.getItem('username');
    const password = await storage.getItem('password');
    const salt = await storage.getItem('salt');
    if (!username || !password || !salt) {
      return null;
    }
  }

  useEffect(() => {
    getImageColors();
  }, [imageUrl]);

  const getImageColors = async () => {
    if (imageUrl) {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const image = URL.createObjectURL(blob);
      extractColors(image).then((colors) => {
        const sortedColors = colors.sort((a, b) => b.area - a.area);
        const filteredColors = sortedColors
          .filter((color) => {
            const rgb = hexToRgb(color.hex);
            //!(rgb.r > 240 && rgb.g > 240 && rgb.b > 240) &&
            return color.area > 0.02;
          })
          .sort((a, b) => {
            const rgbA = hexToRgb(a.hex);
            const rgbB = hexToRgb(b.hex);
            const brightnessA =
              0.299 * rgbA.r + 0.587 * rgbA.g + 0.114 * rgbA.b;
            const brightnessB =
              0.299 * rgbB.r + 0.587 * rgbB.g + 0.114 * rgbB.b;
            return brightnessA - brightnessB;
          });
        console.log(filteredColors);
        setColors(filteredColors);
      });
    }
  };

  function hexToRgb(hex: string) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  }

  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) {
        setIsMobile(true);
      } else {
        setIsMobile(false);
      }
    }

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (tab == 0) {
      setTab(1);
    }
  }, [isMobile]);

  useEffect(() => {
    const adjustHeight = () => {
      const containerElement = container.current;
      if (containerElement) {
        const safeAreaTop =
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue(
              'env(safe-area-inset-top)'
            )
          ) || 0;
        const safeAreaBottom =
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue(
              'env(safe-area-inset-bottom)'
            )
          ) || 0;
        containerElement.style.height = `calc(100vh + ${safeAreaTop}px + ${safeAreaBottom}px)`;
      }
    };

    adjustHeight(); // Initial adjustment
    window.addEventListener('resize', adjustHeight); // Adjust on resize

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener('resize', adjustHeight);
    };
  }, []);

  const [tab, setTab] = useState<number>(0);

  if (!fullScreen) return null;

  return (
    <div
      className={cn(
        'inset-0 z-50 animate-[grow-height_.3s_ease-out]',
        styles.container
      )}
      ref={container}
      style={
        colors.length > 0
          ? {
              background: `${colors[0].hex} linear-gradient(180deg, ${colors[0].hex}, ${colors[0].hex})`,
            }
          : { background: 'linear-gradient(180deg, #000, #000)' }
      }
    >
      {tab !== 0 && isMobile && (
        <TopPlayer imageUrl={imageUrl} setTab={(value) => setTab(value)} />
      )}
      <div
        className={cn(
          'absolute z-40 flex h-full w-full flex-col items-center justify-center md:flex-row'
        )}
      >
        <Left isMobile={isMobile} tab={tab} />
        <div
          className={`h-full flex-col items-center justify-center md:flex ${tab === 0 ? 'hidden md:w-1/2' : 'visible'} ${isMobile ? 'w-full' : 'mr-14 w-4/6'} `}
        >
          <Lyrics tab={tab} isMobile={isMobile} setTab={(tab) => setTab(tab)} />{' '}
        </div>
      </div>
      <div
        className='absolute right-4 top-4 z-50 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-border bg-slate-700 opacity-40 transition-all duration-300 hover:opacity-90'
        onClick={() => handleClose()}
      >
        <X className='color-white' size={24} />
      </div>
      <div className='absolute'>
        <Background colors={colors.slice(1).map((color) => color.hex)} />
      </div>
      <div
        className='fixed bottom-10 z-50 flex w-screen flex-row items-center justify-between px-[15%] opacity-100 md:hidden'
        ref={buttonsRef}
      >
        <button
          className={`color-white flex aspect-square h-9 items-center justify-center rounded-lg opacity-75 ${tab === 1 && 'color-gray-950 bg-slate-300'}`}
          onClick={() => setTab(tab === 1 ? 0 : 1)}
        >
          <LyricsIcon color={(tab === 1 && 'grey') || 'white'} size={24} />
        </button>
        <button
          className={`color-white flex aspect-square h-10 items-center justify-center rounded-full opacity-75 ${tab === 3 && 'color-gray-950 bg-slate-300'}`}
          onClick={() => setTab(tab === 3 ? 0 : 3)}
        >
          <Airplay color={(tab === 3 && 'grey') || 'white'} size={24} />
        </button>
        <button
          className={`color-white flex aspect-square h-10 items-center justify-center rounded-full opacity-75 ${tab === 2 && 'color-gray-950 bg-slate-300'}`}
          onClick={() => setTab(tab === 2 ? 0 : 2)}
        >
          <ListMusic color={(tab === 2 && 'grey') || 'white'} size={24} />
        </button>
      </div>
    </div>
  );
}

interface TopPlayerProps {
  imageUrl: string | null;
  // colors: FinalColor[];
  setTab: (tab: number) => void;
}

export function TopPlayer({ imageUrl, setTab }: TopPlayerProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const progressContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  const { position, duration, playing } = useSourceEvents();
  const { songData } = useCurrentSong();
  const isPaused = playing !== 'playing';

  const updateProgress = useCallback(() => {
    if (!progressRef.current) return;

    if (isNaN(duration)) {
      progressRef.current.style.transform = 'scaleX(0)';
      return;
    }

    const progress = position / duration || 0;
    const boundedProgress = Math.min(Math.max(progress, 0), 1);

    progressRef.current.style.transform = `scaleX(${boundedProgress})`;
    progressRef.current.style.borderRadius =
      Math.abs(boundedProgress - 1) < 0.001 ? '24px' : '24px 0 0 24px';

    if (!isPaused) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [duration, position, isPaused]);

  useEffect(() => {
    if (!progressRef.current) return;

    if (progressRef.current) {
      progressRef.current.style.transform = 'scaleX(0)';
      progressRef.current.style.borderRadius = '24px 0 0 24px';
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (!isPaused) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [updateProgress, isPaused]);

  useEffect(() => {
    updateProgress();
  }, [position, duration, updateProgress]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        'bg-gray absolute z-50 flex aspect-square h-[10vh] w-full animate-[fade-in] items-center justify-center px-[5vw] py-[2vh] opacity-100 duration-1000 ease-in-out',
        styles.avoidSafeArea
      )}
    >
      <div
        ref={progressContainerRef}
        className='absolute z-50 h-[8vh] w-[90vw] overflow-hidden rounded-3xl border border-border bg-gray-800 backdrop-blur-md'
      >
        <div
          ref={progressRef}
          className='h-full w-full origin-left bg-gray-700'
          style={{
            borderRadius: '24px 0 0 24px',
            transform: 'scaleX(0)',
            transition: 'transform 50ms linear, border-radius 150ms ease',
          }}
        />
      </div>
      <div
        className='flex h-full w-full items-center p-4'
        onClick={() => setTab(0)}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            className='relative z-[55] h-[6vh] rounded-lg border border-border object-cover'
            alt='Album art'
          />
        ) : (
          <div className='h-full w-full bg-gray-800' />
        )}
        <div className='ml-4 flex flex-col'>
          <h1 className='z-[55] line-clamp-1 text-lg font-bold text-white'>
            {songData?.title}
          </h1>
          <h2 className='z-[55] line-clamp-1 text-sm text-gray-300'>
            {songData?.album} - {songData?.artist}
          </h2>
        </div>
      </div>
    </div>
  );
}
