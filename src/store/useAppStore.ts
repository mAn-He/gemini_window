import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AppState {
  canvasData: any; // In a real app, you might want a more specific type for fabric.js JSON
  updateCanvasData: (data: any) => void;
  // You can add other global states here
  // e.g., apiKey: string;
  // setApiKey: (key: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      canvasData: null,
      updateCanvasData: (data) => set({ canvasData: data }),

      // apiKey: '',
      // setApiKey: (key) => set({ apiKey: key }),
    }),
    {
      name: 'gemini-canvas-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    }
  )
);
