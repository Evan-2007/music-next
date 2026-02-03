// LyricsDisplay.tsx
import React, { useEffect, useState } from 'react';
import {
  useLyrics,
  useSourceTimeUpdate,
  useSourceControls,
  useCurrentSong,
} from '@/lib/hooks';
import { NormalLyrics } from '@/lib/sources/types';

type LyricLine = NormalLyrics['lines'][number];

interface LyricsDisplayProps {
  isMobile: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  isMouseMoving: boolean;
}

export function SyncedLyrics({
  isMobile,
  containerRef,
  isMouseMoving,
}: LyricsDisplayProps) {
  const { songData, currentSong } = useCurrentSong();
  const { position } = useSourceTimeUpdate();
  const { seek, play } = useSourceControls();

  const {
    lyrics,
    synced,
    error,
  } = useLyrics(currentSong?.track?.id);

  const [currentLine, setCurrentLine] = useState<number>(0);

  // Update current lyric line based on the song position
  useEffect(() => {
    if (containerRef.current && synced) {
      const container = containerRef.current;
      const currentLineElement = container.querySelector(`[data-line="1"]`);
      if (currentLineElement) {
        currentLineElement.scrollIntoView({ block: 'center' });
      }
    }

    if (position && lyrics) {
      const milliseconds = position * 1000;
      const currentLineIndex = lyrics.findIndex(
        (line: LyricLine) => (line.start ?? 0) > milliseconds
      );
      setCurrentLine(currentLineIndex - 1);
    }
  }, [position, lyrics, synced, containerRef]);

  // Reset current line when song changes
  useEffect(() => {
    setCurrentLine(0);
  }, [songData]);

  // Scroll effect when the container is available and lyrics are synced
  useEffect(() => {
    if (containerRef.current && synced) {
      const container = containerRef.current;
      const currentLineElement = container.querySelector(
        `[data-line="${currentLine}"]`
      );
      if (currentLineElement && isMobile) {
        const elementRect = currentLineElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const targetOffset = window.innerHeight * 0.2; // 20vh
        container.scrollTop =
          container.scrollTop +
          (elementRect.top - containerRect.top) -
          targetOffset;
      } else if (currentLineElement) {
        currentLineElement.scrollIntoView({ block: 'center' });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  // Smooth scroll when the current line or mouse state changes
  useEffect(() => {
    if (containerRef.current && !isMouseMoving) {
      const container = containerRef.current;
      const currentLineElement = container.querySelector(
        `[data-line="${currentLine}"]`
      );
      if (currentLineElement && isMobile) {
        const elementRect = currentLineElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const targetOffset = window.innerHeight * 0.23; // 23vh
        container.scrollTo({
          top:
            container.scrollTop +
            (elementRect.top - containerRect.top) -
            targetOffset,
          behavior: 'smooth',
        });
      } else if (currentLineElement) {
        currentLineElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [currentLine, isMouseMoving, isMobile, containerRef]);

  function handleLyricClick(index: number) {
    const line = lyrics?.[index];
    if (line) {
      if (!synced || !line.start) {
        return;
      }
      const seconds = line.start / 1000;
      seek(seconds);
      setCurrentLine(index);
      play();
    }
  }

  return (
    <>
      {error && (
        <p className='mt-6 text-center text-4xl font-bold text-gray-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]'>
          {error}
        </p>
      )}
      {lyrics ? (
        synced ? (
          lyrics.map((line: LyricLine, index: number) => (
            <button key={index} onClick={() => handleLyricClick(index)}>
              <p
                data-line={index}
                className={`z-40 animate-[fade-in] text-wrap px-10 pb-6 text-center text-3xl font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] transition-all duration-1000 ease-in-out md:px-16 md:pb-12 md:text-6xl ${
                  index === currentLine
                    ? 'scale-110 pb-10 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]'
                    : index > currentLine && !isMouseMoving
                      ? 'scale-[80%] text-gray-400 blur-[7px]'
                      : index > currentLine && isMouseMoving
                        ? 'scale-[80%] text-gray-400 blur-0'
                        : isMouseMoving
                          ? 'group-hover:scale-[80%] group-hover:opacity-100'
                          : 'text-gray-400 opacity-0 blur-[7px] transition-all duration-1000'
                }`}
              >
                {line.value}
              </p>
              {line.value === '' && index === currentLine && (
                <div className='mb-10 flex gap-2'>
                  <div className='aspect-square w-10 scale-75 animate-[pulse_3s_ease-out_infinite] rounded-full bg-white pb-4 pt-4'></div>
                  <div className='aspect-square w-10 scale-75 animate-[pulse_3s_ease-out_infinite] rounded-full bg-white pb-4 pt-4 delay-200'></div>
                  <div className='aspect-square w-10 scale-75 animate-[pulse_3s_ease-out_infinite] rounded-full bg-white pb-4 pt-4 delay-500'></div>
                </div>
              )}
            </button>
          ))
        ) : (
          <div className='mb-[30vh] flex h-full w-full flex-col items-center justify-start'>
            {lyrics.map((line: LyricLine, index: number) => (
              <div key={index}>
                <p className='mt-6 text-center text-4xl font-bold text-gray-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]'>
                  {line.value}
                </p>
              </div>
            ))}
          </div>
        )
      ) : (
        <p className='mt-6 text-center text-4xl font-bold text-gray-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]'>
          No lyrics found
        </p>
      )}
    </>
  );
}
