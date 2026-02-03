'use client';
import { Suspense } from 'react';
import { Header } from '@/components/song-display/header';
import { usePlaylistData } from '@/lib/hooks';
import { SongList } from '@/components/song-display/song-list';
import { Separator } from '@/components/ui/separator';

export default function Page() {
  return (
    <div className='flex h-full w-full flex-col items-center'>
      <Suspense fallback={<div>Loading...</div>}>
        <PlaylistPage />
      </Suspense>
    </div>
  );
}

function PlaylistPage() {
  const { data: playlistData, loading } = usePlaylistData();

  if (loading || !playlistData) {
    return <div>Loading playlist data...</div>;
  }

  return (
    <div className='flex h-full w-full flex-col items-center'>
      <Header type='playlist' data={playlistData} />
      <Separator className='my-2 mt-4 w-11/12' />
      {playlistData.tracks && playlistData.tracks.length > 0 && (
        <SongList songs={playlistData.tracks} />
      )}
    </div>
  );
}
