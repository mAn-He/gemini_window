import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // From renderer to main, one-way
  send: (channel: string, data: any) => {
    ipcRenderer.send(channel, data);
  },
  // From renderer to main and back, two-way
  invoke: (channel: string, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
  },
  // From main to renderer, one-way
  on: (channel: string, func: (...args: any[]) => void) => {
    const subscription = (event: any, ...args: any[]) => func(...args);
    ipcRenderer.on(channel, subscription);

    // Return a cleanup function
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
});
