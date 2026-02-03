'use client';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Suspense, useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { useQueueStore } from '@/lib/queue';
import { SourceManager } from '@/lib/sources/source-manager';
import { Song } from '@/lib/sources/types';
import NavidromeIcon from '@/assets/navidrome_dark.svg';
import { GetListByKeyword, VideoItem } from '@/lib/youtubeSearch';
import { Header } from '@/components/song-display/header';
import { Videos } from '@/components/song-display/yt-videos';

export default function Page() {
  const sourceManager = SourceManager.getInstance();
  const play = useQueueStore((state) => state.play);
  const addToQueue = useQueueStore((state) => state.addToQueue);

  return (
    <div className='flex h-full w-full flex-col items-center'>
      <Suspense fallback={<div>Loading...</div>}>
        <Track />
      </Suspense>
    </div>
  );
}

function Track() {
  const searchParams = useSearchParams();
  const paramsObject = Object.fromEntries(searchParams.entries()) as any;

  const fromattedParams = {
    ...paramsObject,
    duration: parseInt(paramsObject.duration, 10),
    availableSources: paramsObject.availableSources.split(','),
  } as Song;

  return (
    <div className='flex h-full w-full flex-col items-center'>
      <Suspense fallback={<div>Loading...</div>}>
        <Header type='track' data={fromattedParams} />
      </Suspense>
      <Suspense fallback={<div>Loading...</div>}>
        {typeof window !== 'undefined' && window.isTauri && (
          <Videos
            title={fromattedParams.title}
            artist={fromattedParams.artist}
          />
        )}
      </Suspense>
    </div>
  );
}
