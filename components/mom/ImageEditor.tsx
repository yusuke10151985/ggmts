'use client';

import React, { useRef, useEffect, useState } from 'react';
import { FaPencilAlt, FaFont, FaUndo, FaRedo, FaSave, FaTimes } from 'react-icons/fa';

interface ImageEditorProps {
  imageUrl: string;
  onSave: (annotatedUrl: string) => void;
  onCancel: () => void;
}

export default function ImageEditor({ imageUrl, onSave, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'text'>('pen');
  const [color, setColor] = useState('#ff0000');
  const [lineWidth, setLineWidth] = useState(3);
  const [fontSize, setFontSize] = useState(16);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Save initial state
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([imageData]);
      setHistoryStep(0);
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const newStep = historyStep - 1;
      ctx.putImageData(history[newStep], 0, 0);
      setHistoryStep(newStep);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const newStep = historyStep + 1;
      ctx.putImageData(history[newStep], 0, 0);
      setHistoryStep(newStep);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'text') {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      
      setTextPosition({ x, y });
      return;
    }

    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool !== 'pen') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const addText = () => {
    if (!textInput || !textPosition) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = color;
    ctx.fillText(textInput, textPosition.x, textPosition.y);
    
    setTextInput('');
    setTextPosition(null);
    saveToHistory();
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isSaving) return;

    setIsSaving(true);

    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/png');
      });

      // Upload to Vercel Blob
      const formData = new FormData();
      formData.append('file', blob, 'annotated-image.png');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.data) {
        onSave(result.data.url);
        alert('Image annotation saved successfully!');
      } else {
        alert('Failed to save annotated image');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save annotated image');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[90vw] h-[90vh] max-w-6xl flex flex-col relative">
        {/* Loading Overlay */}
        {isSaving && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded-lg">
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-lg font-semibold">Saving image...</p>
                <p className="text-sm text-gray-500 mt-1">Please wait</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Image Editor</h3>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
            disabled={isSaving}
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4 p-4 border-b bg-gray-50">
          {/* Tool Selection */}
          <div className="flex gap-2">
            <button
              onClick={() => setTool('pen')}
              className={`p-2 rounded ${tool === 'pen' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              <FaPencilAlt />
            </button>
            <button
              onClick={() => setTool('text')}
              className={`p-2 rounded ${tool === 'text' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              <FaFont />
            </button>
          </div>

          {/* Color Picker */}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 border rounded cursor-pointer"
          />

          {/* Line Width / Font Size */}
          {tool === 'pen' ? (
            <div className="flex items-center gap-2">
              <label className="text-sm">Width:</label>
              <input
                type="range"
                min="1"
                max="20"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm w-8">{lineWidth}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <label className="text-sm">Size:</label>
              <input
                type="range"
                min="12"
                max="48"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm w-8">{fontSize}</span>
            </div>
          )}

          {/* Undo/Redo */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={undo}
              disabled={historyStep <= 0}
              className={`p-2 rounded ${historyStep > 0 ? 'bg-gray-200 hover:bg-gray-300' : 'bg-gray-100 text-gray-400'}`}
            >
              <FaUndo />
            </button>
            <button
              onClick={redo}
              disabled={historyStep >= history.length - 1}
              className={`p-2 rounded ${historyStep < history.length - 1 ? 'bg-gray-200 hover:bg-gray-300' : 'bg-gray-100 text-gray-400'}`}
            >
              <FaRedo />
            </button>
          </div>
        </div>

        {/* Canvas Container */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100">
          <div className="relative inline-block">
            <canvas
              ref={canvasRef}
              onMouseDown={isSaving ? undefined : startDrawing}
              onMouseMove={isSaving ? undefined : draw}
              onMouseUp={isSaving ? undefined : stopDrawing}
              onMouseLeave={isSaving ? undefined : stopDrawing}
              className={`border border-gray-300 bg-white ${isSaving ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
              style={{ maxWidth: '100%', height: 'auto' }}
            />
            
            {/* Text Input */}
            {textPosition && (
              <div
                className="absolute bg-white border border-gray-300 p-2 rounded shadow-lg"
                style={{ left: textPosition.x, top: textPosition.y }}
              >
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addText();
                    }
                  }}
                  placeholder="Enter text..."
                  className="px-2 py-1 border rounded"
                  autoFocus
                />
                <button
                  onClick={addText}
                  className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add
                </button>
                <button
                  onClick={() => setTextPosition(null)}
                  className="ml-1 px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!imageLoaded || isSaving}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FaSave />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}