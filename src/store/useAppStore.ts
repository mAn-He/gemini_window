import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Project } from '../preload/types'; // Assuming this is the correct path

// Define a type for a single chat message
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};


interface AppState {
  // --- Existing State ---
  canvasData: any;
  updateCanvasData: (data: any) => void;

  // --- Project Feature State ---
  projects: Project[];
  activeProjectId: string | null;
  projectMessages: Record<string, ChatMessage[]>; // { projectId: [messages] }
  isProjectLoading: boolean; // To show loading indicators

  // --- Project Feature Actions ---
  fetchProjects: () => Promise<void>;
  createProject: (name: string) => Promise<void>;
  setActiveProjectId: (projectId: string | null) => void;
  addFilesToActiveProject: () => Promise<void>;
  sendMessageToActiveProject: (message: string) => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // --- Existing State Initializers ---
      canvasData: null,
      updateCanvasData: (data) => set({ canvasData: data }),

      // --- Project Feature State Initializers ---
      projects: [],
      activeProjectId: null,
      projectMessages: {},
      isProjectLoading: false,

      // --- Project Feature Actions ---
      setActiveProjectId: (projectId) => set({ activeProjectId: projectId }),

      fetchProjects: async () => {
        const { success, projects, error } = await window.api.project.list();
        if (success && projects) {
          set({ projects });
        } else {
          console.error("Failed to fetch projects:", error);
        }
      },

      createProject: async (name) => {
        const { success, error } = await window.api.project.create(name);
        if (success) {
          await get().fetchProjects(); // Refresh the list
        } else {
          console.error("Failed to create project:", error);
        }
      },

      addFilesToActiveProject: async () => {
        const projectId = get().activeProjectId;
        if (!projectId) return;

        const { success: openSuccess, filePaths } = await window.api.project.openFile();
        if (!openSuccess || filePaths.length === 0) return;

        set({ isProjectLoading: true });
        try {
            for (const filePath of filePaths) {
                const { success: addSuccess, error } = await window.api.project.addFile(projectId, filePath);
                if (!addSuccess) {
                    console.error(`Failed to add file ${filePath}:`, error);
                }
            }
            // Refresh project data to show new files
            await get().fetchProjects();
        } finally {
            set({ isProjectLoading: false });
        }
      },

      sendMessageToActiveProject: async (message) => {
        const projectId = get().activeProjectId;
        if (!projectId) return;

        // Add user message to state
        const userMessage: ChatMessage = { role: 'user', content: message };
        set(state => ({
            projectMessages: {
                ...state.projectMessages,
                [projectId]: [...(state.projectMessages[projectId] || []), userMessage],
            }
        }));

        set({ isProjectLoading: true });
        try {
            const { success, response, error } = await window.api.project.chat(projectId, message);
            if (success && response) {
                const assistantMessage: ChatMessage = { role: 'assistant', content: response };
                 set(state => ({
                    projectMessages: {
                        ...state.projectMessages,
                        [projectId]: [...(state.projectMessages[projectId] || []), assistantMessage],
                    }
                }));
            } else {
                 const errorMessage: ChatMessage = { role: 'assistant', content: `Error: ${error}` };
                 set(state => ({
                    projectMessages: {
                        ...state.projectMessages,
                        [projectId]: [...(state.projectMessages[projectId] || []), errorMessage],
                    }
                }));
            }
        } finally {
            set({ isProjectLoading: false });
        }
      },
    }),
    {
      name: 'gemini-app-storage', // Updated name for broader scope
      storage: createJSONStorage(() => localStorage),
      // Only persist non-sensitive, non-runtime state
      partialize: (state) => ({
          canvasData: state.canvasData,
          projects: state.projects,
          activeProjectId: state.activeProjectId,
          projectMessages: state.projectMessages
      }),
    }
  )
);
