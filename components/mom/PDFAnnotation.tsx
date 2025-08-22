'use client';

import React, { useState, useRef, useEffect } from 'react';

interface PDFAnnotationProps {
  pdfData: string;
  existingAnnotations?: string;
  onSave: (annotatedData: string) => void;
  onClose: () => void;
}

export default function PDFAnnotation({ pdfData, existingAnnotations, onSave, onClose }: PDFAnnotationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [isAddingText, setIsAddingText] = useState(false);
  const [textAnnotations, setTextAnnotations] = useState<Array<{x: number, y: number, text: string}>>([]);
  const [newText, setNewText] = useState('');
  const [textPosition, setTextPosition] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    loadPDF();
  }, [pdfData]);

  useEffect(() => {
    if (pdfDocument) {
      renderPage(currentPage);
    }
  }, [currentPage, pdfDocument]);

  const loadPDF = async () => {
    // For PDF preview, we'll show a placeholder since PDF.js requires additional setup
    // In a real implementation, you would use PDF.js library
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create a placeholder for PDF
    canvas.width = 800;
    canvas.height = 1000;
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#333';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PDF Preview', canvas.width / 2, 100);
    ctx.font = '16px Arial';
    ctx.fillText('(PDF rendering requires PDF.js library)', canvas.width / 2, 140);
    
    // Initialize overlay canvas
    const overlayCanvas = overlayCanvasRef.current;
    if (overlayCanvas) {
      overlayCanvas.width = canvas.width;
      overlayCanvas.height = canvas.height;
    }
  };

  const renderPage = (pageNum: number) => {
    // Placeholder for page rendering
    console.log('Rendering page:', pageNum);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isAddingText) {
      const rect = overlayCanvasRef.current?.getBoundingClientRect();
      if (rect) {
        setTextPosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
      return;
    }

    setIsDrawing(true);
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isAddingText) return;

    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ff0000';
    ctx.lineCap = 'round';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const addTextAnnotation = () => {
    if (textPosition && newText) {
      setTextAnnotations([...textAnnotations, { x: textPosition.x, y: textPosition.y, text: newText }]);
      
      // Draw text on canvas
      const canvas = overlayCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.font = '16px Arial';
          ctx.fillStyle = '#0000ff';
          ctx.fillText(newText, textPosition.x, textPosition.y);
        }
      }
      
      setNewText('');
      setTextPosition(null);
    }
  };

  const handleSave = () => {
    // Combine canvases and save
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!canvas || !overlayCanvas) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Draw base PDF
    tempCtx.drawImage(canvas, 0, 0);
    // Draw annotations
    tempCtx.drawImage(overlayCanvas, 0, 0);

    // Convert to base64
    const annotatedData = tempCanvas.toDataURL('image/png');
    onSave(annotatedData);
  };

  const clearAnnotations = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTextAnnotations([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-6xl max-h-[90vh] overflow-auto">
        <h3 className="text-lg font-semibold mb-4">PDF Annotation</h3>
        
        {/* Toolbar */}
        <div className="mb-4 flex gap-4 items-center">
          <button
            className={`btn btn-sm ${!isAddingText ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsAddingText(false)}
          >
            Draw
          </button>
          <button
            className={`btn btn-sm ${isAddingText ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsAddingText(true)}
          >
            Add Text
          </button>
          <button className="btn btn-sm btn-secondary" onClick={clearAnnotations}>
            Clear
          </button>
          
          {/* Page navigation */}
          <div className="flex items-center gap-2 ml-auto">
            <button 
              className="btn btn-sm" 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button 
              className="btn btn-sm" 
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>

        {/* Text input for annotations */}
        {isAddingText && textPosition && (
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              className="form-control"
              placeholder="Enter text annotation"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTextAnnotation()}
            />
            <button className="btn btn-sm btn-primary" onClick={addTextAnnotation}>
              Add
            </button>
          </div>
        )}

        {/* Canvas container */}
        <div className="relative border border-gray-300 mb-4" style={{ maxHeight: '600px', overflow: 'auto' }}>
          <canvas ref={canvasRef} className="block" />
          <canvas
            ref={overlayCanvasRef}
            className="absolute top-0 left-0"
            style={{ cursor: isAddingText ? 'text' : 'crosshair' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Annotations
          </button>
        </div>
      </div>
    </div>
  );
}