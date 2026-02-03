'use client';
import { Suspense } from 'react';
import { Header } from '@/components/song-display/header';
import { useAlbumData } from '@/lib/hooks';
import { SongList } from '@/components/song-display/song-list';
import { Separator } from '@/components/ui/separator';

export default function Page() {
  return (
    <div className='flex h-full w-full flex-col items-center'>
      <Suspense fallback={<div>Loading...</div>}>
        <Album />
      </Suspense>
    </div>
  );
}

function Album() {
  const { data: albumData, loading } = useAlbumData();

  if (loading || !albumData) {
    return <div>Loading album data...</div>;
  }

  return (
    <div className='flex h-full w-full flex-col items-center'>
      <Header type='album' data={albumData} />
      <Separator className='my-2 mt-4 w-11/12' />
      {albumData.tracks && albumData.tracks.length > 0 && (
        <SongList songs={albumData.tracks} />
      )}
    </div>
  );
}
