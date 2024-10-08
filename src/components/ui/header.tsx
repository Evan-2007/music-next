'use client'
import React from 'react'
import { ModeToggle } from '../theme-toggle'
import {  Search as SearchIcon, CirclePlay} from 'lucide-react'
import {Input } from '../ui/input'
import { useEffect, useState, useRef } from 'react'
import { isElectron as checkIsElectron } from '@/lib/utils'
import { CrossPlatformStorage} from '@/lib/storage/cross-platform-storage'
import {Song} from '@/components/player/types'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {motion } from 'framer-motion'

export function Header() {

    const localStorage = new CrossPlatformStorage();

    const [isElectronApp, setIsElectronApp] = useState(false)

    
    useEffect(() => {
        setIsElectronApp(checkIsElectron())
    }, [])

    return (
        <div className="flex items-center justify-between p-4 bg-card z-10" >
            <LeftMenu />
            <Search />
            <RightMenu />

            {isElectronApp && <WindowControls /> }
        </div>
    )
}

function LeftMenu() {
    return (
        <ul className="flex space-x-4">
            <li>Home</li>
            <li>Library</li>
            <li>Search</li>
        </ul>
    )
}

function RightMenu() {
    return (
        <ul className="flex space-x-4">
            <li>Profile</li>
            <li>Settings</li>
        </ul>
    )
}


function Search() {

    const [results , setResults] = useState<Song[]>([])


    const [credentials, setCredentials] = useState<{username: string | null, password: string | null, salt: string | null}>({username: null, password: null, salt: null});
    const [activeInput, setActiveInput] = useState(false);
    const [search, setSearch] = useState('');

    const inputRef = useRef(null);
    const router = useRouter();
    const resultsContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleFocus = () => {
        if (document.activeElement === inputRef.current) {
            setActiveInput(true);
        }
      };
  
      const handleBlur = () => {
        if (resultsContainerRef.current ) {
            resultsContainerRef.current?.classList.remove('animate-[fadeIn_.001s]')
            resultsContainerRef.current?.classList.add('animate-[fadeOut_.001s]')
        }
        setTimeout(() => {
            setActiveInput(true); //change to false
        }, 100);
      };
  
      document.addEventListener('focus', handleFocus, true);
      document.addEventListener('blur', handleBlur, true);
  
      return () => {
        document.removeEventListener('focus', handleFocus, true);
        document.removeEventListener('blur', handleBlur, true);
      };
    }, []);

    useEffect (() => {
        getCredentials();
    } , [])

    async function getCredentials() {
        const username = await localStorage.getItem('username');
        const password = await localStorage.getItem('password');
        const salt = await localStorage.getItem('salt');
        setCredentials({username, password, salt});
    }


    useEffect(() => {
        console.log('rtesults: ' + results)
    }, [results])



    const handleUpdate = async(e: any) => {
        try {
            setSearch(e.target.value);
            const result = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rest/search3.view?u=${credentials.username}&t=${credentials.password}&s=${credentials.salt}&f=json&v=1.13.0&c=myapp&query=${e.target.value}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const response = await result.json();
            if (response['subsonic-response'].status !== 'ok') {
                console.error('An error occurred:', response['subsonic-response'].error.message);
                throw new Error(response['subsonic-response'].error.status);
            }
            setResults(response['subsonic-response'].searchResult3.song || []);
            console.log(response) 
        } catch (error) {
            console.error('An error occurred:', error);
        }
    }

    return (
        <div className="flex items-center space-x-2 z-10">

            <div className='flex flex-col justify-center items-center'>
  
                    <Input placeholder="Search"  className='w-64 h-8 rounded-2xl' onChange={(e) => handleUpdate(e)} ref={inputRef}/>

                {
                    activeInput && (
                        <>
                            <div className={`h-96 w-96 border-border border rounded-xl mt-5 absolute top-10 z-20 backdrop-blur-sm  duration-1000 ease-in-out animate-[fadeIn_.001s] bg-card/50`} ref={resultsContainerRef}>
                                <ScrollArea className='h-full w-full relative'>
                                    {results.length > 0 ? (
                                        <div className=' h-full flex flex-col rounded-xl'>
                                            {results.map((song, index) => (
                                                <div className=''>
                                                    <div className='grid-cols-7 grid col-auto py-2 pl-2'>
                                                        <button key={index} className='filter-none flex w-full items-center group relative' onClick={() => router.push(`/home/?playing=${song.id}&play=true`)}>
                                                            <img className='w-11 rounded-md absolute' src={`${process.env.NEXT_PUBLIC_API_URL}/rest/getCoverArt?u=${credentials.username}&t=${credentials.password}&s=${credentials.salt}&v=1.13.0&c=myapp&f=json&id=${song.coverArt}`} alt="" />
                                                            <div className='absolute w-11 rounded-md bg-card/20 z-50 h-11 flex justify-center items-center  group-hover:visible invisible group-hover:opacity-100 opacity-0 transition-all duration-300 ease-in backdrop-blur-[2px]'>
                                                                <CirclePlay className='w-8 h-8 text-white m-auto' strokeWidth={.8} />
                                                            </div>
                                                        </button>
                                                        <div className='col-span-5 space-y-1 pr-3'>
                                                            <Link className='text-sm line-clamp-1 hover:underline' href={`/home/?playing=${song.id}&play=true`}>{song.title}</Link>
                                                            <Link className='text-[11px] line-clamp-1 text-gray-500 hover:underline' href={`/home/?playing=${song.id}&play=true`}>{song.artist}</Link>
                                                        </div>
                                                        <ItemMenu />
                                                    </div>
                                                    <div className='w-full bg-border h-[1px] line-clamp-1 px-2'></div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                    <p>No results found</p>
                                    )}
                                </ScrollArea>
                            </div>
                        </>
                    )
                }
            </div>

        </div>
    )
}


import {Ellipsis} from 'lucide-react'

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"



function ItemMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    return (
        <div className="flex items-center space-x-2 pr-4 w-24 z-10">
            <Ellipsis size={24} onClick={toggleMenu} />
            {isOpen && (
                <div ref={menuRef} className="absolute">
                    test
                </div>
            )}
        </div>
    );
}


function WindowControls() {
    return (
        <div className="flex space-x-2 absolute right-0 top-0">
            <div id="min-button">
                <img  src="icons/min-w-10.png 1x, icons/min-w-12.png 1.25x, icons/min-w-15.png 1.5x, icons/min-w-15.png 1.75x, icons/min-w-20.png 2x, icons/min-w-20.png 2.25x, icons/min-w-24.png 2.5x, icons/min-w-30.png 3x, icons/min-w-30.png 3.5x" draggable="false" />
            </div>

            <div  id="max-button">
                <img  src="icons/max-w-10.png 1x, icons/max-w-12.png 1.25x, icons/max-w-15.png 1.5x, icons/max-w-15.png 1.75x, icons/max-w-20.png 2x, icons/max-w-20.png 2.25x, icons/max-w-24.png 2.5x, icons/max-w-30.png 3x, icons/max-w-30.png 3.5x" draggable="false" />
            </div>

            <div  id="restore-button">
                <img  src="icons/restore-w-10.png 1x, icons/restore-w-12.png 1.25x, icons/restore-w-15.png 1.5x, icons/restore-w-15.png 1.75x, icons/restore-w-20.png 2x, icons/restore-w-20.png 2.25x, icons/restore-w-24.png 2.5x, icons/restore-w-30.png 3x, icons/restore-w-30.png 3.5x" draggable="false" />
            </div>

            <div  id="close-button">
                <img  src="icons/close-w-10.png 1x, icons/close-w-12.png 1.25x, icons/close-w-15.png 1.5x, icons/close-w-15.png 1.75x, icons/close-w-20.png 2x, icons/close-w-20.png 2.25x, icons/close-w-24.png 2.5x, icons/close-w-30.png 3x, icons/close-w-30.png 3.5x" draggable="false" />
            </div>
        </div>
    )
}


