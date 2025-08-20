import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

export const ProjectSidebar: React.FC = () => {
  const {
    projects,
    activeProjectId,
    fetchProjects,
    createProject,
    setActiveProjectId
  } = useAppStore();

  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async () => {
    if (newProjectName.trim()) {
      await createProject(newProjectName.trim());
      setNewProjectName('');
    }
  };

  return (
    <div className="w-64 h-full bg-gray-800 text-white p-4 flex flex-col">
      <h2 className="text-xl font-bold mb-4">Projects</h2>

      <div className="mb-4">
        <input
          type="text"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          placeholder="New project name..."
          className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleCreateProject}
          className="w-full mt-2 p-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
        >
          Create Project
        </button>
      </div>

      <div className="flex-grow overflow-y-auto">
        <ul>
          {projects.map((project) => (
            <li
              key={project.id}
              onClick={() => setActiveProjectId(project.id)}
              className={`p-2 rounded cursor-pointer ${
                activeProjectId === project.id ? 'bg-blue-500' : 'hover:bg-gray-700'
              }`}
            >
              {project.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
