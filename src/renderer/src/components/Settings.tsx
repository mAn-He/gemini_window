import React, { useState } from 'react';
import { HardDrive, Cloud, Save } from 'lucide-react';

type StorageLocation = 'local' | 'onedrive' | 'googledrive';

const Settings: React.FC = () => {
  const [selectedStorage, setSelectedStorage] = useState<StorageLocation>('local');

  const handleSave = () => {
    // Here you would call the IPC handler to save the setting
    console.log(`Saving storage location: ${selectedStorage}`);
    // window.api.saveSettings({ storageLocation: selectedStorage });
  };

  return (
    <div className="p-8 text-white w-full">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b border-gray-600 pb-2">Storage Location</h2>
          <p className="text-gray-400 mb-4">Choose where your conversations and data are stored.</p>
          
          <div className="space-y-4">
            <label className={`flex items-center p-4 rounded-lg cursor-pointer transition-all ${selectedStorage === 'local' ? 'bg-blue-600/30 border-blue-500 border' : 'bg-gray-700/50'}`}>
              <input 
                type="radio" 
                name="storage" 
                value="local"
                checked={selectedStorage === 'local'}
                onChange={() => setSelectedStorage('local')}
                className="hidden"
              />
              <HardDrive className="mr-4" size={24} />
              <div>
                <h3 className="font-bold">Local Storage</h3>
                <p className="text-sm text-gray-400">Fastest and most private. Data is stored only on this computer.</p>
              </div>
            </label>

            <label className={`flex items-center p-4 rounded-lg cursor-pointer transition-all ${selectedStorage === 'onedrive' ? 'bg-blue-600/30 border-blue-500 border' : 'bg-gray-700/50'}`}>
              <input 
                type="radio" 
                name="storage" 
                value="onedrive"
                checked={selectedStorage === 'onedrive'}
                onChange={() => setSelectedStorage('onedrive')}
                className="hidden"
              />
              <Cloud className="mr-4" size={24} />
              <div>
                <h3 className="font-bold">Personal OneDrive</h3>
                <p className="text-sm text-gray-400">Sync across devices with your Microsoft account. (Requires login)</p>
              </div>
            </label>

            <label className={`flex items-center p-4 rounded-lg cursor-pointer transition-all ${selectedStorage === 'googledrive' ? 'bg-blue-600/30 border-blue-500 border' : 'bg-gray-700/50'}`}>
              <input 
                type="radio" 
                name="storage" 
                value="googledrive"
                checked={selectedStorage === 'googledrive'}
                onChange={() => setSelectedStorage('googledrive')}
                className="hidden"
              />
              <Cloud className="mr-4" size={24} />
              <div>
                <h3 className="font-bold">Personal Google Drive</h3>
                <p className="text-sm text-gray-400">Sync across devices with your Google account. (Requires login)</p>
              </div>
            </label>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            className="flex items-center justify-center px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            <Save size={18} className="mr-2" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings; 