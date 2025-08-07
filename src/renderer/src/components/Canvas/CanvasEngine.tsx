import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Palette, 
  FileText, 
  Code, 
  Play, 
  Download, 
  Share2, 
  Settings, 
  Sparkles,
  Wand2,
  Copy,
  Save,
  Loader2
} from 'lucide-react';

// Canvas 타입 정의
type CanvasMode = 'document' | 'app' | 'code' | 'research';
type ContentType = 'text' | 'html' | 'react' | 'game' | 'visualization';

interface CanvasProject {
  id: string;
  name: string;
  mode: CanvasMode;
  contentType: ContentType;
  content: string;
  preview?: string;
  createdAt: string;
  updatedAt: string;
}

interface CanvasEngineProps {
  projectId?: string;
  onSave?: (project: CanvasProject) => void;
  onAIRequest?: (request: string) => Promise<string>;
}

const CanvasEngine: React.FC<CanvasEngineProps> = ({
  projectId,
  onSave,
  onAIRequest
}) => {
  // State Management
  const [currentProject, setCurrentProject] = useState<CanvasProject | null>(null);
  const [mode, setMode] = useState<CanvasMode>('document');
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState('');
  const [isAIMode, setIsAIMode] = useState(false);

  // Refs
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  // Load project on mount
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    } else {
      // Create new project
      const newProject: CanvasProject = {
        id: `canvas_${Date.now()}`,
        name: 'Untitled Canvas',
        mode: 'document',
        contentType: 'text',
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setCurrentProject(newProject);
    }
  }, [projectId]);

  // Auto-save functionality
  useEffect(() => {
    if (currentProject && content !== currentProject.content) {
      const timer = setTimeout(() => {
        saveProject();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [content, currentProject]);

  // Load project from IPC
  const loadProject = async (id: string) => {
    try {
      const project = await window.electronAPI.loadCanvasProject(id);
      if (project) {
        setCurrentProject(project);
        setMode(project.mode);
        setContent(project.content);
        setPreview(project.preview || '');
      }
    } catch (error) {
      console.error('Error loading project:', error);
    }
  };

  // Save project
  const saveProject = useCallback(async () => {
    if (!currentProject) return;

    const updatedProject: CanvasProject = {
      ...currentProject,
      content,
      preview,
      updatedAt: new Date().toISOString()
    };

    try {
      await window.electronAPI.saveCanvasProject(updatedProject);
      setCurrentProject(updatedProject);
      onSave?.(updatedProject);
    } catch (error) {
      console.error('Error saving project:', error);
    }
  }, [currentProject, content, preview, onSave]);

  // AI 기반 콘텐츠 생성
  const generateContent = async () => {
    if (!prompt.trim() || !onAIRequest) return;

    setIsLoading(true);
    try {
      let enhancedPrompt = '';
      
      switch (mode) {
        case 'document':
          enhancedPrompt = `Create a well-structured document about: ${prompt}. Format it with proper headings, bullet points, and clear sections.`;
          break;
        case 'app':
          enhancedPrompt = `Generate a complete HTML/CSS/JavaScript application that does: ${prompt}. Include all necessary code in a single HTML file with embedded CSS and JavaScript. Make it interactive and visually appealing.`;
          break;
        case 'code':
          enhancedPrompt = `Write clean, well-commented code for: ${prompt}. Include examples and explanations.`;
          break;
        case 'research':
          enhancedPrompt = `Create an interactive research presentation about: ${prompt}. Include key findings, data visualizations, and actionable insights.`;
          break;
      }

      const response = await onAIRequest(enhancedPrompt);
      setContent(response);
      
      // Generate preview for app mode
      if (mode === 'app') {
        setPreview(response);
      }
      
      setPrompt('');
    } catch (error) {
      console.error('Error generating content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // AI 협업 편집
  const enhanceContent = async (instruction: string) => {
    if (!content.trim() || !onAIRequest) return;

    setIsLoading(true);
    try {
      const enhancedPrompt = `Current content:\n${content}\n\nPlease ${instruction}. Maintain the overall structure and improve the content.`;
      const response = await onAIRequest(enhancedPrompt);
      setContent(response);
    } catch (error) {
      console.error('Error enhancing content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy content to clipboard
  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  // Export content
  const exportContent = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject?.name || 'canvas-export'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      {/* Mode & Actions Bar */}
      <div className="bg-gray-800 border-b border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {(['document', 'app', 'code', 'research'] as CanvasMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  mode === m 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={copyContent}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
              title="Copy Content"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={exportContent}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
              title="Export"
            >
              <Download size={16} />
            </button>
            <button
              onClick={saveProject}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              title="Save Project"
            >
              <Save size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* AI Prompt Section */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex space-x-3">
          <div className="flex-1">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && generateContent()}
              placeholder={`What would you like to create? (${mode} mode)`}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={generateContent}
            disabled={isLoading || !prompt.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Wand2 size={16} />
            )}
            <span>{isLoading ? 'Generating...' : 'Generate'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Content Editor */}
        <div className="flex-1 flex flex-col">
          {/* AI Enhancement Controls */}
          {content && (
            <div className="bg-gray-800 border-b border-gray-700 p-3">
              <div className="flex space-x-2">
                <button
                  onClick={() => enhanceContent('make it more concise and clear')}
                  disabled={isLoading}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                >
                  Make Concise
                </button>
                <button
                  onClick={() => enhanceContent('expand with more details and examples')}
                  disabled={isLoading}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                >
                  Add Details
                </button>
                <button
                  onClick={() => enhanceContent('improve the tone to be more professional')}
                  disabled={isLoading}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                >
                  Professional Tone
                </button>
                <button
                  onClick={() => enhanceContent('make it more creative and engaging')}
                  disabled={isLoading}
                  className="px-3 py-1 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                >
                  More Creative
                </button>
              </div>
            </div>
          )}

          {/* Content Editor */}
          <div className="flex-1 p-4">
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Your content will appear here... Start by entering a prompt above!"
              className="w-full h-full resize-none bg-gray-800 border border-gray-700 rounded-lg p-4 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono text-sm"
            />
          </div>
        </div>

        {/* Preview Panel (for app mode) */}
        {mode === 'app' && (
          <div className="w-1/2 border-l border-gray-700 flex flex-col">
            <div className="bg-gray-800 border-b border-gray-700 p-3">
              <h3 className="text-white font-medium flex items-center space-x-2">
                <Play size={16} />
                <span>Live Preview</span>
              </h3>
            </div>
            <div className="flex-1 p-4">
              {preview ? (
                <iframe
                  ref={previewRef}
                  srcDoc={preview}
                  className="w-full h-full border border-gray-700 rounded-lg bg-white"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="w-full h-full border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-400">
                  Generate an app to see the preview
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <div className="bg-gray-800 rounded-lg p-6 flex items-center space-x-3">
              <Loader2 size={24} className="animate-spin text-blue-500" />
              <span className="text-white">AI is working on your request...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CanvasEngine; 