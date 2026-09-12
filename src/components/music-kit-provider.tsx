'use client';
declare global {
  interface Window {
    MusicKit: any;
    musicKitStatus: string;
  }
}

import { useEffect } from 'react';
import Script from 'next/script';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

async function accessToken() {
  const fetch = window.isTauri ? tauriFetch : window.fetch;


  console.log('Fetching access token...');
  const MediaUserToken = localStorage.getItem('music.q222xnn59b.media-user-token');
  if (localStorage.getItem('music.apple.com:music-token')) {
    console.log('Privileged token found in localStorage.');
    //test if the token is valid by making a request to the Apple Music API
    const testResponse = await fetch('https://amp-api.music.apple.com/v1/me/social/profile', {
      method: 'GET',
      mode: 'no-cors',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('music.apple.com:music-token')}`,
        Origin: 'https://music.apple.com',
        'Media-User-Token': MediaUserToken || '',
      },
    });
    console.log('Test response status:', testResponse);
    if (testResponse.ok) {
      console.log('Privileged token is valid.');
      return localStorage.getItem('music.apple.com:music-token')!;
    } else {
      console.log('Privileged token is invalid.');
      localStorage.removeItem('music.apple.com:music-token');
        // return localStorage.getItem('music.apple.com:music-token')
    }
  }





// 1. Fetch browse with proper headers
const response = await fetch('https://music.apple.com/us/browse', {
  headers: {
'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'

  }
}).catch((error) => {
  console.error('Error fetching browse page:', error);
  throw error;
});
// console.log(response)
const htmlText = await response.text();

console.log('Fetched HTML:', htmlText);
const entryMatch = htmlText.match(/\/assets\/(index(?:\.esm)?~[a-f0-9]+\.js)/i)
                || htmlText.match(/src="(\/assets\/index[^"]+\.js)"/i);

if (!entryMatch) {
  throw new Error('Could not find primary index JS bundle');
}

const jsPath = entryMatch[1].startsWith('/') ? entryMatch[1] : `/assets/${entryMatch[1]}`;
console.log('Fetching bundle:', jsPath);

const jsResponse = await fetch(`https://music.apple.com${jsPath}`);
const jsText = await jsResponse.text();

// 3. Match the full JWT format (Header.Payload.Signature)
// Notice dev tokens start with eyJh (base64 for {"alg":...) or eyJ0 ({"typ":...)
const tokenMatch = jsText.match(/eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+/);

if (!tokenMatch) {
  throw new Error('Could not find JWT in bundle: ' + jsPath);
}

console.log('Success! Access token:', tokenMatch[0]);

return tokenMatch[0];

}

export function MusicKitProvider() {
  async function getAccsessToken() {
    try {
      const token = await accessToken();
      localStorage.setItem('music.apple.com:music-token', token);
    } catch (error) {
      console.error('Error fetching access token:', error);
    }
  }

  useEffect(() => {
    getAccsessToken();

    async function configureMusicKit() {
      try {
        const response = await fetch(
          'https://qgejhylfftwlxrlqsnak.supabase.co/functions/v1/musicKitJWT'
        );
        const { token } = await response.json();

        await window.MusicKit.configure({
          developerToken: token,
          app: {
            name: 'Amplitune',
            build: '1.0.0',
          },
        });
      
        console.log('MusicKit configured successfully.');

        window.dispatchEvent(new Event('musickitready'));
        window.musicKitStatus = 'ready';
      } catch (error) {
        console.error('Error configuring MusicKit:', error);
      }
    }

    if (window.MusicKit && typeof window.MusicKit.configure === 'function') {
      console.log('MusicKit is already loaded. Configuring...');
      configureMusicKit();
    }

    // Set up the event listener immediately
    document.addEventListener('musickitloaded', async () => {
      await configureMusicKit();
    });
  }, []);

  return (
    <Script
      src='https://js-cdn.music.apple.com/musickit/v3/musickit.js'
      strategy='afterInteractive'
    />
  );
}
