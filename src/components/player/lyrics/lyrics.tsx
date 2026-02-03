import { Song } from '@/lib/sources/types';
import { useEffect, useState, useRef, useCallback } from 'react';
import { CrossPlatformStorage } from '@/lib/storage/cross-platform-storage';
import { debounce, set } from 'lodash';
import Queue from '@/assets/queue.svg';
import LyricsSVG from '@/assets/lyrics.svg';
import { Check, MessageSquareQuote } from 'lucide-react';
import { useQueueStore } from '@/lib/queue';
import { ScrollArea } from '../../ui/scroll-area';
import { useRouter } from 'next/navigation';
import { CirclePlay } from 'lucide-react';
import { Ellipsis } from 'lucide-react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
} from '@nextui-org/dropdown';
import { subsonicURL } from '@/lib/sources/navidrome';
import { SourceManager } from '@/lib/sources/source-manager';
import { ErrorLyrics } from '@/lib/sources/types';
import { SyncedLyrics } from './synced';
import {
  SyllableLyricsType,
  getSyllableLyrics,
  SyllableLyrics,
} from './syllable';

interface NormalLyricsProps {
  tab: number;
  setTab: React.Dispatch<React.SetStateAction<number>>;
  isMobile: boolean;
}

export default function Lyrics({ tab, setTab, isMobile }: NormalLyricsProps) {
  const [isMouseMoving, setIsMouseMoving] = useState<boolean>(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const [synced, setSynced] = useState<boolean>(true);
  const [syllable, setSyllable] = useState<boolean>(false);
  const [syllableLyricsData, setSyllableLyricsData] =
    useState<SyllableLyricsType | null>(null);

  const songData = useQueueStore((state) => state.queue.currentSong?.track);

  useEffect(() => {
    let cancelled = false;

    const checkSyllableLyrics = async () => {
      setSyllable(false);
      setSyllableLyricsData(null);
      const syllableLyrics = await getSyllableLyrics(setSyllableLyricsData);
      if (cancelled) return;
      if (syllableLyrics) {
        setSyllable(true);
      }
    };

    checkSyllableLyrics();

    return () => {
      cancelled = true;
    };
  }, [songData]);

  const debouncedMouseStop = useCallback(
    debounce(() => {
      setIsMouseMoving(false);
    }, 2000),
    []
  );

  const debounceTouchStop = useCallback(
    debounce(() => {
      setIsMouseMoving(false);
    }, 5000),
    []
  );

  const handleMouseMove = useCallback(() => {
    setIsMouseMoving(true);
    isMobile ? debouncedMouseStop() : debounceTouchStop();
  }, [debouncedMouseStop, debounceTouchStop, isMobile]);

  return (
    <div className='relative flex h-full w-full justify-center overflow-hidden overflow-x-clip overscroll-none md:items-center'>
      <div
        ref={lyricsContainerRef}
        className={`${synced ? 'py-[20vh] md:py-[50vh]' : 'py-[10vh]'} no-scrollbar group flex h-full w-full flex-col ${!syllable && 'items-center'} overflow-y-auto overflow-x-hidden overscroll-none md:mr-10`}
        style={{ scrollBehavior: 'smooth' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setIsMouseMoving(false)}
        onTouchStart={handleMouseMove}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseMove}
      >
        {tab === 1 ? (
          <>
            {syllable && syllableLyricsData ? (
              <SyllableLyrics
                isMobile={isMobile}
                containerRef={lyricsContainerRef}
                isMouseMoving={isMouseMoving}
                lyrics={syllableLyricsData}
              />
            ) : (
              <SyncedLyrics
                isMobile={isMobile}
                containerRef={lyricsContainerRef}
                isMouseMoving={isMouseMoving}
              />
            )}
          </>
        ) : (
          <QueueList isMouseMoving={isMouseMoving} />
        )}
      </div>

      <div
        className={`absolute bottom-24 flex w-full items-center justify-center transition-all duration-1000 ease-in-out ${
          isMouseMoving ? 'opacity-100' : 'opacity-100'
        } max-md:hidden`}
      >
        <div
          className={`h-11 w-64 rounded-md transition-all duration-1000 ease-in-out ${
            isMouseMoving
              ? 'bg-gray-900/70 backdrop-blur-[5px]'
              : 'bg-gray-900/0'
          }`}
        >
          <div
            className={`${
              isMouseMoving ? 'opacity-100' : 'opacity-0'
            } absolute flex h-full w-full items-center align-middle transition-all duration-1000 ease-in-out`}
          >
            <div className='absolute z-50 h-full w-full p-1'>
              <div
                className={`absolute left-0 z-50 h-9 w-32 transform rounded-md bg-gray-600 px-1 transition-all duration-500 ease-in-out ${
                  tab === 1
                    ? 'ml-1 translate-x-0'
                    : 'ml-[-4px] translate-x-full'
                }`}
              ></div>
            </div>
            <div
              className='z-[60] flex h-full w-3/6 items-center justify-center'
              onClick={() => setTab(1)}
            >
              <MessageSquareQuote
                size={32}
                className='z-50 pl-1'
                onClick={() => setTab(1)}
              />
            </div>
            <div
              className='z-[60] flex h-full w-3/6 items-center justify-center'
              onClick={() => setTab(2)}
            >
              <Queue className='z-50 h-8 w-10 fill-white pr-1' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QueueList({ isMouseMoving }: { isMouseMoving: boolean }) {
  const currentlyPlaying = useQueueStore((state) => state.queue.currentSong);
  const queue = useQueueStore((state) => state.queue);
  const [baseUrl, setBaseUrl] = useState<string | undefined>(undefined);

  const scrollRef = useRef<HTMLDivElement>(null);
  const currentSongElement = useRef<HTMLDivElement>(null);

  const localStorage = new CrossPlatformStorage();
  const setSong = useQueueStore((state) => state.setCurrentSong);
  const removeFromQueue = useQueueStore((state) => state.removeFromQueue);
  const clearQueue = useQueueStore((state) => state.clearQueue);

  useEffect(() => {
    setBaseImageUrl();
  }, []);

  const setBaseImageUrl = async () => {
    setBaseUrl(await subsonicURL('/rest/getCoverArt', ''));
  };

  useEffect(() => {
    if (scrollRef.current && !isMouseMoving) {
      currentSongElement.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [isMouseMoving]);

  return (
    <div
      className={`no-scrollbar absolute top-24 flex h-[75vh] w-9/12 animate-[fade-in] flex-col overflow-auto backdrop-opacity-0 transition-all duration-700 max-md:bg-card/30 ${isMouseMoving && 'bg-card/60 backdrop-blur-md backdrop-opacity-100'} overscroll-none rounded-2xl p-10`}
    >
      <div className='top-24 flex justify-between'>
        <div></div>
        <div>
          <button onClick={() => clearQueue()}>
            <h1>Clear</h1>
          </button>
        </div>
      </div>
      <div className='mb-2 mr-10 mt-8 text-2xl font-bold'>Previous</div>
      <div className='space-y-2'>
        {baseUrl !== undefined &&
          queue.songs.map((song, index) => (
            <>
              {index < queue.currentSong.index && (
                <div className='flex justify-between'>
                  <div className='group/image flex space-x-4'>
                    <div className='' onClick={() => setSong(index)}>
                      <img
                        src={song.imageUrl}
                        alt='cover art'
                        className='absolute h-12 w-12 rounded-md'
                      />
                      <div className='invisible z-50 flex h-12 w-12 cursor-pointer items-center justify-center rounded-md bg-card/20 opacity-0 backdrop-blur-[2px] transition-all duration-300 ease-in group-hover/image:visible group-hover/image:opacity-100'>
                        <CirclePlay
                          className='m-auto h-8 w-8 text-white'
                          strokeWidth={0.8}
                        />
                      </div>
                    </div>
                    <div>
                      <h1>{song.title}</h1>
                      <h1>
                        {song.artist} - {song.album}
                      </h1>
                    </div>
                  </div>
                  <div className='flex items-center justify-center'>
                    <DropdownComponent index={index} song={song} />
                  </div>
                </div>
              )}
            </>
          ))}
      </div>
      <div>
        <h1
          className='mb-2 mr-10 mt-8 text-2xl font-bold'
          ref={currentSongElement}
        >
          Playing
        </h1>
        <div className='flex justify-between'>
          <div className='flex space-x-4'>
            <img
              src={currentlyPlaying.track.imageUrl}
              alt='cover art'
              className='h-12 w-12 rounded-md'
            />
            <div>
              <h1>{currentlyPlaying?.track.title}</h1>
              <h1>
                {currentlyPlaying?.track.artist} -{' '}
                {currentlyPlaying?.track.album}
              </h1>
            </div>
          </div>
          <div className='flex items-center justify-center'>
            <DropdownComponent
              index={queue.currentSong.index}
              song={currentlyPlaying?.track}
            />
          </div>
        </div>
      </div>
      <div className='mb-2 mr-10 mt-8 text-2xl font-bold'>Up Next</div>
      <div className='space-y-3'>
        {queue.songs.map((song, index) => (
          <>
            {index > queue.currentSong.index && (
              <div className='flex justify-between'>
                <div className='group/image flex space-x-4'>
                  <div className='' onClick={() => setSong(index)}>
                    <img
                      src={song.imageUrl}
                      alt='cover art'
                      className='absolute h-12 w-12 rounded-md'
                    />
                    <div className='invisible z-50 flex h-12 w-12 cursor-pointer items-center justify-center rounded-md bg-card/20 opacity-0 backdrop-blur-[2px] transition-all duration-300 ease-in group-hover/image:visible group-hover/image:opacity-100'>
                      <CirclePlay
                        className='m-auto h-8 w-8 text-white'
                        strokeWidth={0.8}
                      />
                    </div>
                  </div>
                  <div>
                    <h1>{song.title}</h1>
                    <h1>
                      {song.artist} - {song.album}
                    </h1>
                  </div>
                </div>
                <div className='flex items-center justify-center'>
                  <DropdownComponent index={index} song={song} />
                </div>
              </div>
            )}
          </>
        ))}
      </div>
    </div>
  );
}

function DropdownComponent({ index, song }: { index: number; song: Song }) {
  const removeFromQueue = useQueueStore((state) => state.removeFromQueue);

  const handleRemove = (index: number) => {
    console.log(index);
    removeFromQueue(index);
  };

  return (
    <Dropdown
      classNames={{
        content:
          'bg-background border-border border rounded-xl backdrop-blur-xl',
      }}
    >
      <DropdownTrigger>
        <Ellipsis size={24} />
      </DropdownTrigger>
      <DropdownMenu className='text-sm'>
        <DropdownItem onClick={() => handleRemove(index)} key={index}>
          Remove from Queue
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
