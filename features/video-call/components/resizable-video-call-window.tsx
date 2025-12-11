// ================================
// Resizable Video Call Window Component
// ================================
// Draggable and resizable video call window inspired by Zoom, Google Meet, Teams
// Features: Drag by header, resize by corners/edges, minimize, restore

"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { GripVertical, Minimize2, Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ResizableVideoCallWindowProps {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
  onMinimize?: () => void;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  className?: string;
}

export function ResizableVideoCallWindow({
  children,
  title,
  onClose,
  onMinimize,
  defaultWidth = 900,
  defaultHeight = 700,
  minWidth = 400,
  minHeight = 300,
  className,
}: ResizableVideoCallWindowProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  
  const windowRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ width: 0, height: 0, x: 0, y: 0 });

  // Load saved position and size from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('videoCallWindowState');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setPosition(state.position || { x: 0, y: 0 });
        setSize(state.size || { width: defaultWidth, height: defaultHeight });
      } catch (e) {
        // Ignore parse errors
      }
    } else {
      // Center the window on first open
      const centerX = (window.innerWidth - defaultWidth) / 2;
      const centerY = (window.innerHeight - defaultHeight) / 2;
      setPosition({ x: centerX, y: centerY });
    }
  }, [defaultWidth, defaultHeight]);

  // Save position and size to localStorage
  useEffect(() => {
    if (windowRef.current) {
      localStorage.setItem('videoCallWindowState', JSON.stringify({
        position,
        size,
      }));
    }
  }, [position, size]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (isMaximized) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  }, [position, isMaximized]);

  // Handle drag
  useEffect(() => {
    const handleDrag = (e: MouseEvent) => {
      if (!isDragging || isMaximized) return;
      
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      
      // Constrain to viewport
      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - size.height;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, size, isMaximized]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    if (isMaximized) return;
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    resizeStartRef.current = {
      width: size.width,
      height: size.height,
      x: e.clientX,
      y: e.clientY,
    };
  }, [size, isMaximized]);

  // Handle resize
  useEffect(() => {
    const handleResize = (e: MouseEvent) => {
      if (!isResizing || !resizeDirection || isMaximized) return;

      const deltaX = e.clientX - resizeStartRef.current.x;
      const deltaY = e.clientY - resizeStartRef.current.y;

      let newWidth = size.width;
      let newHeight = size.height;
      let newX = position.x;
      let newY = position.y;

      // Handle different resize directions
      if (resizeDirection.includes('right')) {
        newWidth = Math.max(minWidth, Math.min(size.width + deltaX, window.innerWidth - position.x));
      }
      if (resizeDirection.includes('left')) {
        const widthChange = size.width - Math.max(minWidth, size.width - deltaX);
        newWidth = Math.max(minWidth, size.width - deltaX);
        newX = Math.max(0, position.x + (size.width - newWidth));
      }
      if (resizeDirection.includes('bottom')) {
        newHeight = Math.max(minHeight, Math.min(size.height + deltaY, window.innerHeight - position.y));
      }
      if (resizeDirection.includes('top')) {
        const heightChange = size.height - Math.max(minHeight, size.height - deltaY);
        newHeight = Math.max(minHeight, size.height - deltaY);
        newY = Math.max(0, position.y + (size.height - newHeight));
      }

      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newX, y: newY });
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      setResizeDirection(null);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, resizeDirection, size, position, minWidth, minHeight, isMaximized]);

  // Handle maximize/restore
  const handleMaximize = useCallback(() => {
    if (isMaximized) {
      // Restore
      setIsMaximized(false);
      setSize({ width: defaultWidth, height: defaultHeight });
      const centerX = (window.innerWidth - defaultWidth) / 2;
      const centerY = (window.innerHeight - defaultHeight) / 2;
      setPosition({ x: centerX, y: centerY });
    } else {
      // Maximize
      setIsMaximized(true);
      setPosition({ x: 0, y: 0 });
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
  }, [isMaximized, defaultWidth, defaultHeight]);

  // Handle minimize
  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
    onMinimize?.();
  }, [onMinimize]);

  if (isMinimized) {
    return (
      <>
        {/* Backdrop Overlay */}
        <div className="fixed inset-0 z-[99] bg-black/20" />
        
        {/* Minimized Bar (like Teams/Zoom) */}
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-[100] bg-surface-800 border-t border-surface-700",
            "flex items-center justify-between px-4 py-3 shadow-lg",
            className
          )}
        >
          <div
            className="flex items-center gap-3 cursor-pointer hover:bg-surface-700/50 px-3 py-2 rounded transition-colors flex-1"
            onClick={() => setIsMinimized(false)}
          >
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-white">{title}</span>
            <span className="text-xs text-surface-400">Click to restore</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-white hover:bg-surface-700"
              onClick={() => setIsMinimized(false)}
              title="Restore"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-white hover:bg-red-600"
              onClick={onClose}
              title="End Call"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Backdrop Overlay (like Zoom/Meet) */}
      <div
        className="fixed inset-0 z-[99] bg-black/40 backdrop-blur-sm"
        onClick={() => {
          // Optional: Click outside to minimize or do nothing
        }}
      />
      
      {/* Resizable Window */}
      <div
        ref={windowRef}
        className={cn(
          "fixed z-[100] bg-surface-900 rounded-lg shadow-2xl border border-surface-700",
          "flex flex-col overflow-hidden",
          isDragging && "cursor-move",
          isResizing && "cursor-resize",
          className
        )}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
          transition: isDragging || isResizing ? 'none' : 'all 0.2s ease',
        }}
      >
      {/* Header - Draggable */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 bg-surface-800/90 backdrop-blur-sm border-b border-surface-700",
          "cursor-move select-none",
          !isMaximized && "hover:bg-surface-800"
        )}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-3 flex-1">
          <GripVertical className="w-4 h-4 text-surface-400" />
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          {onMinimize && (
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-white hover:bg-surface-700"
              onClick={handleMinimize}
              title="Minimize"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-white hover:bg-surface-700"
            onClick={handleMaximize}
            title={isMaximized ? "Restore" : "Maximize"}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-white hover:bg-red-600"
            onClick={onClose}
            title="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>

      {/* Resize Handles */}
      {!isMaximized && (
        <>
          {/* Corner handles - visible on hover */}
          <div
            className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-10 group"
            onMouseDown={(e) => handleResizeStart(e, 'top-left')}
          >
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-surface-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div
            className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-10 group"
            onMouseDown={(e) => handleResizeStart(e, 'top-right')}
          >
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-surface-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div
            className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-10 group"
            onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
          >
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-surface-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-10 group"
            onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
          >
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-surface-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          
          {/* Edge handles */}
          <div
            className="absolute top-0 left-4 right-4 h-2 cursor-ns-resize z-10 hover:bg-surface-700/20 transition-colors"
            onMouseDown={(e) => handleResizeStart(e, 'top')}
          />
          <div
            className="absolute bottom-0 left-4 right-4 h-2 cursor-ns-resize z-10 hover:bg-surface-700/20 transition-colors"
            onMouseDown={(e) => handleResizeStart(e, 'bottom')}
          />
          <div
            className="absolute left-0 top-4 bottom-4 w-2 cursor-ew-resize z-10 hover:bg-surface-700/20 transition-colors"
            onMouseDown={(e) => handleResizeStart(e, 'left')}
          />
          <div
            className="absolute right-0 top-4 bottom-4 w-2 cursor-ew-resize z-10 hover:bg-surface-700/20 transition-colors"
            onMouseDown={(e) => handleResizeStart(e, 'right')}
          />
        </>
      )}
      </div>
    </>
  );
}

