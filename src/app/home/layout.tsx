'use client'
import React from 'react'
import {Player} from '@/components/player/main'
import {Header} from '@/components/ui/header'
import { useEffect, useState } from 'react'
import FullScreenPlayer from '@/components/player/full-player'
import {Song} from '@/components/player/types'

export default function HomeLayout({
    children,
  }: {
    children: React.ReactNode
  }) {

    const [audioUrl, setAudioUrl] = useState('')
    const [fullScreen, setFullScreen] = useState(false)
    const [songData, setSongData] = useState<Song | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const audioRef = React.createRef<HTMLAudioElement>()
    return(
      <div className='w-screen h-full'>
      <div className='absolute'>
      {fullScreen && <FullScreenPlayer songData={songData} imageUrl={imageUrl} audioRef={audioRef} setFullScreen={setFullScreen} />}
      </div>
      <div className='w-full h-screen flex flex-col bg-card absolute'>
        <Header />
        <div className='w-full h-full pr-4 pl-4 '>
          <div className='w-full h-full border-border border rounded-xl bg-background '>
            {children}
          </div>
        </div>
        <Player audioRef={audioRef} setAudioUrl={setAudioUrl} audioUrl={audioUrl} setFullScreen={setFullScreen} songData={songData} setSongData={setSongData} imageUrl={imageUrl} setImageUrl={setImageUrl}/>
        <audio ref={audioRef} src={audioUrl} />
      </div>

      </div>
    )
  }