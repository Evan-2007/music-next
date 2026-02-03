'use client';
import { Suspense } from 'react';
import { useArtistData } from '@/lib/hooks';
import { HLSPlayer } from '@/components/ui/HLSPlayer';
import Image from 'next/image';
import Link from 'next/link';

export default function Page() {
  return (
    <div className='flex h-full w-full flex-col items-center'>
      <Suspense fallback={<div>Loading...</div>}>
        <ArtistPage />
      </Suspense>
    </div>
  );
}

function ArtistPage() {
  const { data: artist, loading } = useArtistData();

  if (!artist || loading) {
    return <div>Loading album data...</div>;
  }

  const artworkUrl = artist.artwork?.url || artist.imageUrl || '';
  const videoSrc = artist.editorialVideo?.fullscreen;

  const sortedAlbums = [...(artist.albums || [])].sort(
    (a, b) =>
      new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
  );
  const mostRecentAlbum = sortedAlbums.length > 0 ? sortedAlbums[0] : null;

  return (
    <div className='flex h-full w-full flex-col items-center'>
      <div className='relative flex h-[30vw] w-full flex-col items-center overflow-hidden rounded-t-md bg-black'>
        <div className='absolute'>
          {videoSrc ? (
            <HLSPlayer src={videoSrc} />
          ) : (
            <div className='flex h-[30vw] w-full items-center justify-center text-white'>
              No video available
            </div>
          )}
        </div>
        <div className='0 absolute bottom-0 left-0 flex w-full'>
          <Image
            src={artworkUrl || '/placeholder.png'}
            alt={artist.name || 'Artist Artwork'}
            width={180}
            height={180}
            className='mb-6 ml-6 rounded-full'
          />
          <div className='mb-6 ml-4 flex flex-col justify-center'>
            <h1 className='text-3xl font-bold text-white'>{artist.name}</h1>
            <p className='w-1/2 p-4 pr-6 text-sm text-gray-800'>
              {artist.bio
                ? artist.bio.length > 180
                  ? artist.bio.slice(0, 180) + '...'
                  : artist.bio
                : ''}
            </p>
          </div>
        </div>
      </div>

      <div className='flex w-full p-10'>
        {mostRecentAlbum && (
          <div>
            <h2 className='mb-2 text-2xl font-bold'>New Release:</h2>
            <div className='flex flex-col items-start gap-4 md:flex-row'>
              <div className='relative'>
                <Image
                  src={mostRecentAlbum.imageUrl || ''}
                  width={180}
                  height={180}
                  alt={mostRecentAlbum.title || ''}
                />
              </div>
              <div className='mt-2 flex flex-col'>
                <Link
                  className='mt-2 text-lg font-semibold hover:underline'
                  href={`/home/album?id=${mostRecentAlbum.id}&source=${artist.source}`}
                >
                  <p>{mostRecentAlbum.title}</p>
                </Link>
                <div className='text-gray-600'>
                  Released on:{' '}
                  {new Date(mostRecentAlbum.releaseDate).toLocaleDateString()}
                </div>
                <div className='text-gray-600'>
                  Total Tracks: {mostRecentAlbum.totalTracks}
                </div>
              </div>
            </div>
          </div>
        )}
        <div className='grid grid-cols-7 overflow-scroll'>
          {artist.songs &&
            artist.songs.length > 0 &&
            artist.songs.map((song, index) => (
              <div key={index} className='mb-2'>
                <Link
                  className='text-md hover:underline'
                  href={`/home/album?id=${song.albumId || ''}&source=${artist.source}`}
                >
                  {song.title}
                </Link>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
