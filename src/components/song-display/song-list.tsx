import { Song } from '@/lib/sources/types';
import { Separator } from '@/components/ui/separator';

export function SongList({ songs }: { songs: Song[] }) {
  return (
    <div className='flex h-full w-full flex-col items-center overflow-y-auto scrollbar-none'>
      {songs.length === 0 ? (
        <p className='text-gray-400'>No songs found</p>
      ) : (
        songs.map((song, index) => (
          <div
            key={index}
            className='flex w-11/12 flex-row items-start space-x-3 p-2 hover:bg-gray-800'
          >
            <img
              src={song.imageUrl}
              alt={song.title}
              className='h-12 w-12 rounded-md'
            />
            <div className='flex w-full flex-col'>
              <p className='font-bold text-white'>{song.title}</p>
              <p className='text-gray-400'>{song.artist}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
