'use client';
import { useSearchParams } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useState, Suspense } from 'react';
import { useSourceSearch } from '@/lib/hooks';
import { SongItem } from '@/components/song/song-item';

export default function Search() {
  const [tab, setTab] = useState('Top Results');

  return (
    <div className='flex h-full w-full flex-col items-center'>
      <div className='flex w-11/12 flex-col items-center'>
        <div className='mb-3 mt-3 flex w-full flex-row items-end space-x-1 overflow-scroll scrollbar-none'>
          <Button
            variant={tab === 'Top Results' ? 'default' : 'secondary'}
            onClick={() => setTab('Top Results')}
          >
            <p>Top Results</p>
          </Button>
          <Button
            variant={tab === 'Tracks' ? 'default' : 'secondary'}
            onClick={() => setTab('Tracks')}
          >
            <p>Tracks</p>
          </Button>
          <Button
            variant={tab === 'Albums' ? 'default' : 'secondary'}
            onClick={() => setTab('Albums')}
          >
            <p>Albums</p>
          </Button>
          <Button
            variant={tab === 'Artists' ? 'default' : 'secondary'}
            onClick={() => setTab('Artists')}
          >
            <p>Artists</p>
          </Button>
          <Button
            variant={tab === 'Playlists' ? 'default' : 'secondary'}
            onClick={() => setTab('Playlists')}
          >
            <p>Playlists</p>
          </Button>
          <Button
            variant={tab === 'Videos' ? 'default' : 'secondary'}
            onClick={() => setTab('Videos')}
          >
            <p>Videos</p>
          </Button>
        </div>
        <Separator />
      </div>
      <div className='flex h-full w-full flex-col items-center'>
        <Suspense fallback={<div>Loading...</div>}>
          <Results tab={tab} />
        </Suspense>
      </div>
    </div>
  );
}

function Results({ tab }: { tab: string }) {
  const searchParams = useSearchParams();
  const query = searchParams.get('query');
  const { results, loading } = useSourceSearch(query);

  return (
    <div className='flex w-full flex-col items-center'>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className='flex w-full flex-col items-center'>
          {results ? (
            <div className='flex w-full flex-col items-center'>
              {results.songs.length > 0 &&
                results.songs.map((song, index) => (
                  <div
                    key={index}
                    className={`flex w-full flex-col items-center ${tab === 'Tracks' ? 'block' : 'hidden'}`}
                  >
                    <SongItem data={song} type='song' />
                  </div>
                ))}
              {results.albums.length > 0 &&
                results.albums.map((album, index) => (
                  <div
                    key={index}
                    className={`flex w-full flex-col items-center ${tab === 'Albums' ? 'block' : 'hidden'}`}
                  >
                    <SongItem data={album} type='album' />
                  </div>
                ))}
              {results.artists.length > 0 &&
                results.artists.map((artist, index) => (
                  <div
                    key={index}
                    className={`flex w-full flex-col items-center ${tab === 'Artists' ? 'block' : 'hidden'}`}
                  >
                    <SongItem data={artist} type='artist' />
                  </div>
                ))}
            </div>
          ) : (
            <div>No results found.</div>
          )}
        </div>
      )}
    </div>
  );
}
