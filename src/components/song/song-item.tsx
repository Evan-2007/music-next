import {
  Song,
  AlbumSummary,
  ArtistSummary,
} from '@/lib/sources/types';
import { SourceManager } from '@/lib/sources/source-manager';
import { useRouter } from 'next/navigation';
import { useQueueStore } from '@/lib/queue';

type SongItemProps =
  | { type: 'song'; data: Song }
  | { type: 'playlist'; data: any }
  | { type: 'album'; data: AlbumSummary }
  | { type: 'artist'; data: ArtistSummary }
  | { type: 'video'; data: any };

export function SongItem({ data, type }: SongItemProps) {
  const router = useRouter();
  const play = useQueueStore((state) => state.play);
  const handleClick = () => {
    if (type === 'song') {
      const queryParams = new URLSearchParams(
        Object.entries(data as unknown as Record<string, string>)
      ).toString();
      router.push(`track?${queryParams}`);
    } else if (type === 'playlist') {
      router.push(`playlist/${data.source}/${data.id}`);
    } else if (type === 'album') {
      router.push(`album?source=${data.source}&id=${data.id}`);
    } else if (type === 'artist') {
      router.push(`artist/${data.source}/${data.id}`);
    } else if (type === 'video') {
      router.push(`video/${data.source}/${data.id}`);
    }
  };

  return (
    <div
      className='flex w-11/12 flex-row items-start space-x-3 p-2 hover:bg-gray-800'
      onClick={() => handleClick()}
    >
      <img
        src={data.imageUrl}
        alt={data.title}
        className={`h-12 w-12 ${type === 'song' ? 'rounded-md' : type === 'artist' ? 'rounded-lg' : ''}`}
      />
      <div className='flex w-full flex-col'>
        {type === 'song' ? (
          <>
            <p className='font-bold text-white'>{data.title}</p>
            <p className='text-gray-400'>{data.artist}</p>
          </>
        ) : type === 'artist' ? (
          <p className='font-bold text-white'>{data.name}</p>
        ) : type === 'album' ? (
          <p className='font-bold text-white'>{data.title}</p>
        ) : type === 'playlist' ? (
          <p className='font-bold text-white'>{data.title}</p>
        ) : (
          <p className='font-bold text-white'>{data.title}</p>
        )}
      </div>
    </div>
  );
}
