import Image from 'next/image';
import { useQueueStore } from '@/lib/queue';
import { Song, AlbumData, Playlist } from '@/lib/sources/types';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import NavidromeIcon from '@/assets/navidrome_dark.svg';
import { Separator } from '@/components/ui/separator';

type HeaderProps =
  | { type: 'track'; data: Song }
  | { type: 'album'; data: AlbumData }
  | { type: 'playlist'; data: Playlist };

export function Header({ type, data }: HeaderProps) {
  const play = useQueueStore((state) => state.play);
  const addToQueue = useQueueStore((state) => state.addToQueue);
  const queue = useQueueStore((state) => state.queue);
  const playAlbum = useQueueStore((state) => state.playAlbum);

  return (
    <div className='flex h-full w-full flex-col items-center pt-16 max-lg:items-center lg:flex-row lg:pl-24'>
      <Image
        src={
          type === 'album' && data.artWork
            ? data.artWork.url
            : (data as Song).imageUrl
        } // Use album artwork if available
        alt='Logo'
        width={300}
        height={300}
        className='rounded-xl'
      />
      <div className='flex h-full flex-col justify-center max-lg:mt-3 lg:ml-10'>
        <div className='flex flex-col items-center justify-center lg:items-start'>
          <h1 className='text-2xl font-bold'>
            {type === 'track' ? data.title : data.name}
          </h1>
          {type !== 'playlist' && (
            <h2 className='text-xl text-gray-400'>{data.artist}</h2>
          )}
          {type === 'track' && (
            <>
              <h3 className='text-md text-gray-500'>{data.album}</h3>
              <h3 className='text-md text-gray-500'>
                {Math.floor(data.duration / 1000 / 60)}:
                {Math.floor(data.duration / 1000) % 60 < 10
                  ? '0' + (Math.floor(data.duration / 1000) % 60)
                  : Math.floor(data.duration / 1000) % 60}
              </h3>
            </>
          )}
        </div>
        <div className='mb-2 flex w-full flex-row items-end max-lg:mt-3 max-lg:justify-center lg:mt-10 lg:h-full'>
          {type == 'track' && (
            <button
              onClick={() => play(data)}
              className='flex items-center justify-center rounded-xl bg-red-700 p-2 text-white hover:bg-red-600'
            >
              Play
              <div className='ml-2 h-4 w-4'>
                {data.source === 'navidrome' && <NavidromeIcon />}
                {data.source === 'tidal' && <TidalLogo />}
                {data.source === 'musicKit' && <AMusicLogo />}
              </div>
            </button>
          )}
          {(type == 'album' || type == 'playlist') && queue.songs.length > 0 ? (
            <Dialog>
              <DialogTrigger asChild>
                <button className='flex items-center justify-center rounded-xl bg-red-700 p-2 text-white hover:bg-red-600'>
                  Play
                  <div className='ml-2 h-4 w-4'>
                    {data.source === 'navidrome' && <NavidromeIcon />}
                    {data.source === 'tidal' && <TidalLogo />}
                    {data.source === 'musicKit' && <AMusicLogo />}
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className='w-48 bg-slate-600/10 backdrop-blur-md'>
                <DialogTitle>Clear Queue?</DialogTitle>
                <DialogFooter className='sm:justify-start'>
                  <DialogClose asChild>
                    <div className='mt-4 flex w-full flex-row items-center justify-between'>
                      <button
                        type='button'
                        className='text-lg font-bold text-red-500'
                        onClick={() => {
                          if (data.tracks) {
                            playAlbum(data.tracks, 'clear'); // Play the album tracks
                          }
                        }}
                      >
                        Clear
                      </button>
                      <Separator className='mx-2 h-8 w-px' />
                      <button
                        type='button'
                        className='text-lg font-bold'
                        onClick={() => {
                          if (data.tracks) {
                            playAlbum(data.tracks, 'preserve');
                          }
                        }}
                      >
                        Keep
                      </button>
                    </div>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <button
              onClick={() => type === 'track' && play(data)}
              className='flex items-center justify-center rounded-xl bg-red-700 p-2 text-white hover:bg-red-600'
            >
              Play
              <div className='ml-2 h-4 w-4'>
                {data.source === 'navidrome' && <NavidromeIcon />}
                {data.source === 'tidal' && <TidalLogo />}
                {data.source === 'musicKit' && <AMusicLogo />}
              </div>
            </button>
          )}
          {type === 'track' && (
            <button
              className='ml-4 flex items-center justify-center rounded-xl bg-gray-700 p-2 text-white hover:bg-gray-600'
              onClick={() => addToQueue(data)}
            >
              Add to Queue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AMusicLogo() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      aria-label='Apple Music'
      role='img'
      viewBox='0 0 512 512'
    >
      <rect width='100%' height='100%' rx='15%' fill='url(#g)' />
      <linearGradient id='g' x1='.5' y1='.99' x2='.5' y2='.02'>
        <stop offset='0' stop-color='#FA233B' />
        <stop offset='1' stop-color='#FB5C74' />
      </linearGradient>
      <path
        fill='#ffffff'
        d='M199 359V199q0-9 10-11l138-28q11-2 12 10v122q0 15-45 20c-57 9-48 105 30 79 30-11 35-40 35-69V88s0-20-17-15l-170 35s-13 2-13 18v203q0 15-45 20c-57 9-48 105 30 79 30-11 35-40 35-69'
      />
    </svg>
  );
}

function TidalLogo() {
  return (
    <svg
      fill='#ffffff'
      viewBox='0 0 24 24'
      role='img'
      xmlns='http://www.w3.org/2000/svg'
    >
      <title>Tidal icon</title>
      <path d='M12.012 3.992L8.008 7.996 4.004 3.992 0 7.996 4.004 12l4.004-4.004L12.012 12l-4.004 4.004 4.004 4.004 4.004-4.004L12.012 12l4.004-4.004-4.004-4.004zM16.042 7.996l3.979-3.979L24 7.996l-3.979 3.979z' />
    </svg>
  );
}
