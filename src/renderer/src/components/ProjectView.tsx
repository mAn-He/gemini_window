import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ProjectChat } from './ProjectChat';
import { File, Plus, Loader } from 'lucide-react';

export const ProjectView: React.FC = () => {
  const {
    activeProjectId,
    projects,
    addFilesToActiveProject,
    isProjectLoading
 } = useAppStore();

  const activeProject = projects.find(p => p.id === activeProjectId);

  if (!activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Select a project</h2>
          <p className="text-gray-400">Choose a project from the sidebar to start working.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold">{activeProject.name}</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Management Panel */}
        <div className="w-1/3 border-r border-gray-700 p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Files ({activeProject.files.length})</h3>
            <button
              onClick={addFilesToActiveProject}
              disabled={isProjectLoading}
              className="flex items-center gap-2 p-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-500"
            >
              {isProjectLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Plus size={18} />}
              Add Files
            </button>
          </div>
          <div className="flex-grow overflow-y-auto bg-gray-800 rounded p-2">
            {activeProject.files.length === 0 ? (
                <p className="text-gray-400 text-center mt-4">No files added yet.</p>
            ) : (
                <ul>
                {activeProject.files.map((filePath, index) => (
                    <li key={index} className="flex items-center gap-2 p-2 text-gray-300">
                    <File size={16} />
                    <span className="truncate">{filePath.split(/[\\/]/).pop()}</span>
                    </li>
                ))}
                </ul>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="w-2/3 flex flex-col">
          <ProjectChat projectId={activeProject.id} />
        </div>
      </div>
    </div>
  );
};
