'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Attachment } from '@/types/mom';

interface Props {
  imageData: string;
  onSave: (annotatedData: string) => void;
  onCancel: () => void;
  attachmentId: string;
}

export default function ImageAnnotation({ imageData, onSave, onCancel, attachmentId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ff0000');
  const [lineWidth, setLineWidth] = useState(3);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);
  // **RESIZABLE WINDOW**: State for window dimensions
  const [windowWidth, setWindowWidth] = useState(1200); // Larger default width
  const [windowHeight, setWindowHeight] = useState(800); // Larger default height
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [resizeStartHeight, setResizeStartHeight] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = imageData;
  }, [imageData]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setLastX(x);
    setLastY(y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    setLastX(x);
    setLastY(y);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearAnnotations = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = imageData;
  };

  // **RESIZE HANDLERS**: Handle window resizing
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeStartX(e.clientX);
    setResizeStartY(e.clientY);
    setResizeStartWidth(windowWidth);
    setResizeStartHeight(windowHeight);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const deltaX = e.clientX - resizeStartX;
      const deltaY = e.clientY - resizeStartY;
      
      const newWidth = Math.max(600, resizeStartWidth + deltaX);
      const newHeight = Math.max(400, resizeStartHeight + deltaY);
      
      setWindowWidth(newWidth);
      setWindowHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStartX, resizeStartY, resizeStartWidth, resizeStartHeight]);

  // **SAVE ACTION**: Save annotation to application state only
  const saveAnnotation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    alert('Annotation saved successfully!');
  };

  // **DOWNLOAD ACTION**: Download annotated image to user's device
  const downloadAnnotation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `annotated_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* **LARGER DEFAULT SIZE**: Window now starts at 1200x800px */}
      <div 
        ref={modalRef}
        className="bg-white rounded-lg p-6 relative"
        style={{ 
          width: `${windowWidth}px`, 
          height: `${windowHeight}px`,
          maxWidth: '95vw',
          maxHeight: '95vh'
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-semibold">Annotate Image</h3>
          <button
            className="text-3xl text-gray-500 hover:text-gray-700"
            onClick={onCancel}
          >
            ×
          </button>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg mb-4 flex items-center gap-4">
          <label className="flex items-center gap-2">
            <span className="font-semibold">Color:</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 border-0 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center gap-2">
            <span className="font-semibold">Size:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-32"
            />
            <span className="text-sm">{lineWidth}px</span>
          </label>

          <button
            className="btn btn-sm btn-secondary"
            onClick={clearAnnotations}
          >
            Clear
          </button>

          {/* **SEPARATE SAVE/DOWNLOAD**: Split into two distinct actions */}
          <button
            className="btn btn-sm btn-success"
            onClick={() => {
              const canvas = canvasRef.current;
              if (canvas) {
                onSave(canvas.toDataURL());
              }
            }}
          >
            Save
          </button>
          
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              const canvas = canvasRef.current;
              if (canvas) {
                const link = document.createElement('a');
                link.download = `annotated-image-${Date.now()}.png`;
                link.href = canvas.toDataURL();
                link.click();
              }
            }}
          >
            Download
          </button>
        </div>

        <div 
          className="overflow-auto border border-gray-300 rounded"
          style={{ height: `calc(100% - 180px)` }}
        >
          <canvas
            ref={canvasRef}
            className="cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
          />
        </div>
        
        {/* **RESIZE HANDLE**: Draggable corner for manual resizing */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-400 hover:bg-gray-600"
          style={{
            clipPath: 'polygon(100% 0, 100% 100%, 0 100%)'
          }}
          onMouseDown={startResize}
          title="Drag to resize window"
        />
      </div>
    </div>
  );
}