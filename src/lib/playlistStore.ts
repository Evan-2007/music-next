import { create } from 'zustand';
import { PlaylistSummary } from '@/lib/sources/types';
import { SourceManager } from './sources/source-manager';

export interface PlaylistStore {
  playlists: PlaylistSummary[];
  setPlaylists: (playlists: PlaylistSummary[]) => void;
  refreshPlaylists: () => Promise<void>;
}

const sourceManager = SourceManager.getInstance();

export const usePlaylistStore = create<PlaylistStore>((set) => ({
  playlists: [],
  setPlaylists: (playlists: PlaylistSummary[]) => set({ playlists }),
  refreshPlaylists: async () => {
    try {
      const playlists = await sourceManager.getPlaylists();
      set({ playlists });
    } catch (error) {
      console.error(error);
    }
  },
}));
