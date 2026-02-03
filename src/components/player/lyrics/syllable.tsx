import React, {
  useEffect,
  useState,
  useMemo,
  useLayoutEffect,
  useRef,
} from 'react';
import XmlJS from 'xml-js';
import { useSourceManager, useSourcePlayPause, useCurrentSong } from '@/lib/hooks';
import { SourceManager } from '@/lib/sources/source-manager';
import localFont from 'next/font/local';

declare global {
  interface Window {
    isTauri?: boolean;
  }
}
import { useQueueStore } from '@/lib/queue';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { format } from 'path';
import { json } from 'stream/consumers';

export interface SyllableLyricsType {
  sections: {
    lines: {
      words: {
        value: string;
        start: number;
        end: number;
        whitespace?: boolean;
      }[];
      start: number;
      end: number;
      key: string;
      agent: string;
    }[];
    start: number;
    end: number;
    songPart: string;
  }[];

  lang: string;
  timing: string;
}

function convertToMilliseconds(timeString: string) {
  const [minutes, seconds] = timeString.split(':');
  const [wholeSecs, fractionalSecs] = seconds.split('.');

  const fractionalDigits = fractionalSecs.length;
  const fractionalValue =
    parseInt(fractionalSecs) / Math.pow(10, fractionalDigits);

  const totalSeconds =
    parseInt(minutes) * 60 + parseInt(wholeSecs) + fractionalValue;

  return totalSeconds;
}

function formatTime(time: string) {
  if (typeof time !== 'string') {
    return parseFloat(time);
  }
  if (time.includes(':')) {
    return convertToMilliseconds(time);
  } else {
    return parseFloat(time);
  }
}

// soetimes spaces get placed a line early

export async function getSyllableLyrics(
  setSyllableLyrics: (lyrics: SyllableLyricsType) => void
) {
  const fetch = window.isTauri ? tauriFetch : window.fetch;
  const sourceManager = SourceManager.getInstance();
  const songId = useQueueStore.getState().queue.currentSong?.track.id;
  if (!window.isTauri && sourceManager.activeSource !== 'musicKit') {
    console.log('Not running in Tauri, cannot fetch syllable lyrics');
    return false;
  }
  const token = localStorage.getItem('music.apple.com:music-token');
  const MediaUserToken = localStorage.getItem(
    'music.q222xnn59b.media-user-token'
  );

  try {
    const response = await fetch(
      'https://amp-api.music.apple.com/v1/catalog/us/songs/' +
        songId +
        '/syllable-lyrics',
      {
        method: 'GET',
        mode: 'no-cors',
        headers: {
          Authorization: `Bearer ${token}`,
          Origin: 'https://music.apple.com',
          'Media-User-Token': MediaUserToken || '',
        },
      }
    );
    const text = await response.text();
    const json = JSON.parse(text);
    if (json.data.length > 0) {
      let xml = json.data[0].attributes.ttml;

      const spanCloseRegex = /<\/span>/g;
      const whitespaceFlags: boolean[] = [];
      let m;
      while ((m = spanCloseRegex.exec(xml)) !== null) {
        const pos = m.index + m[0].length;

        const after = xml.substring(pos);

        const wsMatch = after.match(/^\s+/);
        if (wsMatch) {
          const afterWS = after.substring(
            wsMatch[0].length,
            wsMatch[0].length + 5
          );
          whitespaceFlags.push(afterWS.startsWith('<span'));
        } else {
          whitespaceFlags.push(false);
        }
      }
      console.log('Whitespace flags (per span in order):', whitespaceFlags);

      const options = {
        compact: false,
        ignoreComment: true,
        trim: false,
        preserveChildrenOrder: true,
      };
      const result = XmlJS.xml2js(xml, options);

      const tt = result.elements.find((el: any) => el.name === 'tt');
      if (!tt) {
        console.error('TT element not found');
        return false;
      }
      if (tt.attributes['itunes:timing'] !== 'Word') {
        console.log('Not word timing, cannot fetch syllable lyrics');
        return false;
      }

      const body = tt.elements.find((el: any) => el.name === 'body');
      if (!body) {
        console.error('Body element not found');
        return false;
      }
      console.log(body);

      let globalSpanIndex = 0;
      const sections = body.elements
        .filter((el: any) => el.name === 'div')
        .map((section: any) => {
          const lines = section.elements
            .filter((el: any) => el.name === 'p')
            .map((line: any) => {
              const words = [];
              if (line.elements && Array.isArray(line.elements)) {
                for (let i = 0; i < line.elements.length; i++) {
                  const node = line.elements[i];
                  if (node.type === 'element' && node.name === 'span') {
                    let value = '';
                    if (node.elements && node.elements.length > 0) {
                      const textNode = node.elements.find(
                        (el: any) => el.type === 'text'
                      );
                      if (textNode) {
                        value = textNode.text;
                      }
                    }
                    const word: any = {
                      value,
                      start: formatTime(node.attributes.begin),
                      end: formatTime(node.attributes.end),
                    };

                    if (
                      globalSpanIndex < whitespaceFlags.length &&
                      whitespaceFlags[globalSpanIndex]
                    ) {
                      word.whitespace = true;
                    }
                    globalSpanIndex++;
                    words.push(word);
                  }
                }
              }
              return {
                words,
                start: formatTime(line.attributes.begin),
                end: formatTime(line.attributes.end),
                key: line.attributes['itunes:key'],
                agent: line.attributes['ttm:agent'],
              };
            });
          return {
            lines,
            start: parseFloat(section.attributes.begin),
            end: parseFloat(section.attributes.end),
            songPart: section.attributes['itunes:songPart'],
          };
        });

      const syllableLyrics: SyllableLyricsType = {
        sections,
        lang: tt.attributes['xml:lang'],
        timing: tt.attributes['itunes:timing'],
      };
      console.log(syllableLyrics);
      setSyllableLyrics(syllableLyrics);
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(error);
    return false;
  }
}

interface WordData {
  value: string;
  start: number;
  end: number;
  whitespace?: boolean;
}

interface GradientTextLineProps {
  words: WordData[];
  progress: number;
  whitespace?: boolean;
  active?: boolean;
  agent: string;
}

type GradientLetterProps = {
  letter: string;
  letterStart: number;
  letterEnd: number;
  progress: number;
  whitespace?: boolean;
};

const myFont = localFont({
  src: '../../../../public/fonts/SF-Pro-Display-bold.woff',
  display: 'swap',
});

const GradientWord: React.FC<{
  word: string;
  wordStart: number;
  wordEnd: number;
  progress: number;
  whitespace?: boolean;
  agent: number;
}> = ({ word, wordStart, wordEnd, progress, whitespace, agent }) => {
  const letters = word.split('');

  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const [letterWidths, setLetterWidths] = useState<number[]>([]);

  useEffect(() => {
    const widths = letterRefs.current.map((ref) => (ref ? ref.offsetWidth : 0));
    setLetterWidths(widths);
  }, [word]);

  let overallPercent = 0;
  if (progress >= wordEnd) {
    overallPercent = 100;
  } else if (progress > wordStart) {
    overallPercent = ((progress - wordStart) / (wordEnd - wordStart)) * 100;
  }

  const totalWidth = letterWidths.reduce((acc, width) => acc + width, 0);
  const cumulativeOffsets = letterWidths.map((width, index) =>
    letterWidths.slice(0, index + 1).reduce((acc, w) => acc + w, 0)
  );

  const shouldGlow =
    (wordEnd - wordStart) / word.length > 0.3 && word.length > 1;

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
      }}
      className={` ${myFont.className} ${agent > 1 ? 'text-left' : ''}`}
    >
      {letters.map((letter, index) => {
        const letterStartPercent =
          totalWidth && index > 0
            ? (cumulativeOffsets[index - 1] / totalWidth) * 100
            : 0;
        const letterEndPercent = totalWidth
          ? (cumulativeOffsets[index] / totalWidth) * 100
          : 0;

        let letterFillPercent = 0;
        if (overallPercent >= letterEndPercent) {
          letterFillPercent = 100;
        } else if (overallPercent > letterStartPercent) {
          letterFillPercent =
            ((overallPercent - letterStartPercent) /
              (letterEndPercent - letterStartPercent)) *
            100;
        }

        return (
          <span
            key={index}
            style={{ position: 'relative', display: 'inline-block' }}
            className={`${letterFillPercent > 0 && !shouldGlow ? '-translate-y-1 duration-500' : ''} transition-all ${shouldGlow && letterFillPercent > 1 && '-translate-y-1 animate-[letter-glow_1.4s_ease-out]'} `}
          >
            {/* Base letter*/}
            <span
              style={{ color: '#8c8da2' }}
              ref={(el) => {
                letterRefs.current[index] = el;
              }}
            >
              {letter}
            </span>
            {/* Overlay fill effect */}
            <span
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${letterFillPercent}%`,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                background: 'white',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                height: '120%',
                filter:
                  shouldGlow && letterFillPercent > 0 && overallPercent < 100
                    ? 'drop-shadow(0 0 2px white)'
                    : 'drop-shadow(0 0 0px white)',
                transition: 'filter 0.5s ease-in-out',
              }}
            >
              {letter}
            </span>
          </span>
        );
      })}
      {whitespace && '\u00A0'}
    </span>
  );
};

const GradientTextLine: React.FC<GradientTextLineProps> = ({
  words,
  progress,
  active,
  agent,
}) => {
  const agentNumber = () => {
    if (typeof agent === 'string' && agent.includes('v')) {
      return parseInt(agent.replace('v', ''));
    }
    return 1;
  };

  return (
    <div
      className={`mb-4 flex flex-wrap drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] md:text-6xl ${active ? '' : 'text-3xl'} ${agent == 'v2' ? 'w-4/6 justify-end pr-4' : 'w-full'} `}
    >
      {words.map((w, index) => (
        <>
          <GradientWord
            key={`${w.value} + ${index}`}
            word={w.value}
            wordStart={w.start}
            wordEnd={w.end}
            progress={progress}
            whitespace={w.whitespace}
            agent={agentNumber()}
          />
        </>
      ))}
    </div>
  );
};

interface LyricsDisplayProps {
  isMobile: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  isMouseMoving: boolean;
  lyrics: SyllableLyricsType;
}

export function SyllableLyrics({
  isMobile,
  containerRef,
  isMouseMoving,
  lyrics,
}: LyricsDisplayProps) {
  const currentQueue = useQueueStore((state) => state.queue);
  const sourceManager = useSourceManager();

  const [currentLine, setCurrentLine] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const playing = useSourcePlayPause(); // Use source state for accurate sync
  const [multipleSinger, setMultipleSinger] = useState<boolean>(false);

  const { songData } = useCurrentSong();

  const handleLyricClick = (index: number) => {
    sourceManager.seek(index);
  };

  const lines = useMemo(() => {
    return lyrics.sections.flatMap((section) =>
      section.lines.map((line) => ({
        ...line,
      }))
    );
  }, [lyrics]);

  useEffect(() => {
    let rafId: number | null = null;
    let lastFrameTime = performance.now();

    let lastSourceTime = sourceManager.getPosition() || 0;

    const handleSourceUpdate = () => {
      if (playing !== 'playing') {
        return;
      }
      const newSourceTime = sourceManager.getPosition() || 0;

      if (
        newSourceTime > lastSourceTime ||
        newSourceTime < lastSourceTime - 1
      ) {
        lastSourceTime = newSourceTime;
      }
    };

    const removeListener = sourceManager.onTimeUpdate(handleSourceUpdate);

    const tick = () => {
      if (playing !== 'playing') {
        console.log(playing);

        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        return;
      }

      const now = performance.now();
      const delta = (now - lastFrameTime) / 1000;
      lastFrameTime = now;

      const currentSourceTime = sourceManager.getPosition() || lastSourceTime;

      if (currentSourceTime > lastSourceTime) {
        lastSourceTime = currentSourceTime;
      } else {
        lastSourceTime += delta;
      }

      setProgress(lastSourceTime);
      rafId = requestAnimationFrame(tick);
    };

    if (playing === 'playing') {
      tick();
    }

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      removeListener();
    };
  }, [sourceManager, playing]);

  useEffect(() => {
    console.log(lines);
  }, [lines]);

  const [twoActive, setTwoActive] = useState<number>();

  useEffect(() => {
    const currentLineIndex = lines.findIndex((line) => line.start > progress);
    setCurrentLine(currentLineIndex - 1);

    if (lines[currentLineIndex - 1]?.end > lines[currentLineIndex ]?.start + 2) {

        setTwoActive(currentLineIndex - 1);
    }

     if ((twoActive !== undefined && currentLineIndex - 2 > twoActive) || (twoActive !== undefined && currentLineIndex < twoActive)) {
       setTwoActive(undefined);
     }

    console.log(currentLineIndex - 1, twoActive);
  }, [progress]);

  useEffect(() => {
    if (containerRef.current && !isMouseMoving && twoActive !== currentLine -1) {
      const container = containerRef.current;
      const currentLineElement = container.querySelector(
        `[data-line="${currentLine}"]`
      );
      if (currentLineElement && !isMobile) {
        currentLineElement.scrollIntoView({ block: 'center' });
      } else if (currentLineElement && isMobile) {
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
      }
    }
  }, [currentLine, isMouseMoving]);

  useEffect(() => {
    if (
      lyrics.sections.some((section) =>
        section.lines.some((line) => line.agent !== 'v1')
      )
    ) {
      setMultipleSinger(true);
      console.log('Multiple singers detected');
    }
  }, [lyrics]);

  return (
    <>
      {error && (
        <p className='mt-6 text-center text-4xl font-bold text-gray-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]'>
          {error}
        </p>
      )}
      {lyrics ? (
        lines.map((line, index) => (
          <button
            key={index}
            onClick={() => handleLyricClick(line.start)}
            data-line={index}
            className={`text-left ${index < currentLine && !isMouseMoving ? 'opacity-0' : ''}  mb-16 flex transition-all duration-700 ${((index > currentLine || index < currentLine) && index !== twoActive) && !isMouseMoving ? 'blur-sm' : ''} pl-2 ${multipleSinger && line.agent !== 'v2' ? 'w-4/6' : 'w-full'} ${line.agent === 'v2' && 'items-end justify-end'} ${index == twoActive ? "opacity-100 blur-0" : ''}`}
          >
            <GradientTextLine
              words={line.words}
              // fontUrl="https://applesocial.s3.amazonaws.com/assets/styles/fonts/sanfrancisco/sanfranciscodisplay-bold-webfont.woff  "
              progress={progress}
              active={index === currentLine}
              agent={line.agent}
              // start={line.start}
              // end={line.end}
            />
            {line.words.length == 0 && index === currentLine && (
              <div className='mb-10 flex gap-2'>
                <div className='aspect-square w-10 scale-75 animate-[pulse_3s_ease-out_infinite] rounded-full bg-white pb-4 pt-4'></div>
                <div className='aspect-square w-10 scale-75 animate-[pulse_3s_ease-out_infinite] rounded-full bg-white pb-4 pt-4 delay-200'></div>
                <div className='aspect-square w-10 scale-75 animate-[pulse_3s_ease-out_infinite] rounded-full bg-white pb-4 pt-4 delay-500'></div>
              </div>
            )}
          </button>
        ))
      ) : (
        <p className='mt-6 text-center text-4xl font-bold text-gray-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]'>
          No lyrics found
        </p>
      )}
    </>
  );
}
