import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { useAppStore } from '../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { v4 as uuidv4 } from 'uuid';

const GeminiCanvas: React.FC = () => {
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState('');

  const { canvasData, updateCanvasData } = useAppStore(
    useShallow((state) => ({
      canvasData: state.canvasData,
      updateCanvasData: state.updateCanvasData,
    }))
  );

  // Effect for canvas initialization and event handling
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const canvas = new fabric.Canvas(fabricCanvasRef.current || undefined, {
        width: canvasContainerRef.current.clientWidth,
        height: canvasContainerRef.current.clientHeight,
        backgroundColor: '#f0f0f0',
    });
    fabricCanvasRef.current = canvas;

    // Load initial data if it exists
    if (canvasData) {
        canvas.loadFromJSON(canvasData, () => canvas.renderAll());
    }

    const syncState = () => {
        if (fabricCanvasRef.current) {
            // Include 'name' property for object identification
            const json = fabricCanvasRef.current.toJSON(['name']);
            updateCanvasData(json);
        }
    };

    canvas.on('object:added', syncState);
    canvas.on('object:modified', syncState);
    canvas.on('object:removed', syncState);

    // [Implemented] Handler for updates from the main process (AI-generated results)
    const handleCanvasUpdate = (event: any, data: any) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      console.log("Received Canvas Command:", data);

      try {
        switch (data.command) {
          case 'add':
            if (data.object) {
              fabric.util.enlivenObjects([data.object], (objects: fabric.Object[]) => {
                objects.forEach((obj) => {
                    // Assign a unique ID if it doesn't have one
                    if (!obj.name) {
                        obj.name = uuidv4();
                    }
                    canvas.add(obj);
                });
                canvas.renderAll();
              }, 'fabric');
            }
            break;

          case 'modify':
            if (data.targetId && data.object) {
              const targetObject = canvas.getObjects().find(obj => obj.name === data.targetId);
              if (targetObject) {
                // Exclude type and name from being modified directly
                const { type, name, ...propertiesToUpdate } = data.object;
                targetObject.set(propertiesToUpdate);
                targetObject.setCoords(); // Recalculate controls bounding box
                canvas.requestRenderAll();
              } else {
                console.warn("Target object not found for modification:", data.targetId);
              }
            }
            break;

          case 'remove':
            if (data.targetId) {
              const targetObject = canvas.getObjects().find(obj => obj.name === data.targetId);
              if (targetObject) {
                canvas.remove(targetObject);
                canvas.requestRenderAll();
              } else {
                console.warn("Target object not found for removal:", data.targetId);
              }
            }
            break;

          default:
            console.warn("Unknown canvas command:", data.command);
        }
      } catch (error) {
        console.error("Error applying canvas update:", error);
      }
    };

    const cleanup = window.api.on('canvas:update', handleCanvasUpdate);

    // Resize handler
    const resizeObserver = new ResizeObserver(entries => {
        if (entries[0]) {
            const { width, height } = entries[0].contentRect;
            canvas.setWidth(width).setHeight(height).renderAll();
        }
    });
    resizeObserver.observe(canvasContainerRef.current);

    return () => {
      cleanup();
      resizeObserver.disconnect();
      canvas.dispose();
    };
  }, [updateCanvasData, canvasData]); // Rerun if the base data changes externally

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    const currentCanvasState = fabricCanvasRef.current?.toJSON(['name']);
    console.log("Sending to AI:", { prompt, canvasState: currentCanvasState });
    await window.api.invoke('run-canvas-ai', prompt, currentCanvasState);
    setPrompt('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, border: '1px solid #ccc' }} ref={canvasContainerRef}>
        <canvas ref={fabricCanvasRef} />
      </div>
      <div style={{ padding: '10px', display: 'flex' }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
          placeholder="Describe what you want to add or change..."
          style={{ flex: 1, padding: '8px', marginRight: '10px' }}
        />
        <button onClick={handleGenerate} style={{ padding: '8px 16px' }}>
          Generate
        </button>
      </div>
    </div>
  );
};

export default GeminiCanvas;
