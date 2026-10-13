import { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Check, X, RefreshCw, Loader2, Move } from 'lucide-react';

interface ImageCropModalProps {
  imageFile: File;
  onCropComplete: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

export function ImageCropModal({ imageFile, onCropComplete, onCancel }: ImageCropModalProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchDistance, setTouchDistance] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Preview display dimensions in CSS pixels (mobile friendly)
  const PREVIEW_SIZE = 260;
  // Compact output resolution (220x220 at 0.75 JPEG is ~12-16KB, perfectly fitting Google Sheets 50KB cell limit)
  const OUTPUT_SIZE = 220;

  // Load image file into HTMLImageElement using createObjectURL with FileReader fallback (iOS Safari safe)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setLoadError(false);

    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(imageFile);
    } catch {
      objectUrl = null;
    }

    const img = new Image();

    const handleLoadedImage = (loadedImg: HTMLImageElement) => {
      if (!isMounted) return;
      setImage(loadedImg);
      setLoading(false);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setRotation(0);
    };

    img.onload = () => {
      handleLoadedImage(img);
    };

    img.onerror = () => {
      // Fallback: FileReader readAsDataURL (handles edge cases in iOS Safari)
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (!isMounted) return;
          const fallbackImg = new Image();
          fallbackImg.onload = () => handleLoadedImage(fallbackImg);
          fallbackImg.onerror = () => {
            if (!isMounted) return;
            setLoading(false);
            setLoadError(true);
          };
          fallbackImg.src = e.target?.result as string;
        };
        reader.onerror = () => {
          if (!isMounted) return;
          setLoading(false);
          setLoadError(true);
        };
        reader.readAsDataURL(imageFile);
      } catch {
        if (!isMounted) return;
        setLoading(false);
        setLoadError(true);
      }
    };

    if (objectUrl) {
      img.src = objectUrl;
    } else {
      // Trigger reader fallback directly
      img.onerror(new Event('error'));
    }

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageFile]);

  // Draw the preview on HTML5 canvas with device pixel ratio scaling
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = PREVIEW_SIZE * dpr;
    canvas.height = PREVIEW_SIZE * dpr;

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

    const imgAspect = image.width / image.height;
    let baseWidth = PREVIEW_SIZE;
    let baseHeight = PREVIEW_SIZE;

    if (imgAspect >= 1) {
      baseHeight = PREVIEW_SIZE;
      baseWidth = PREVIEW_SIZE * imgAspect;
    } else {
      baseWidth = PREVIEW_SIZE;
      baseHeight = PREVIEW_SIZE / imgAspect;
    }

    ctx.translate(PREVIEW_SIZE / 2, PREVIEW_SIZE / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    let adjustedPanX = pan.x;
    let adjustedPanY = pan.y;
    if (rotation === 90) {
      adjustedPanX = pan.y;
      adjustedPanY = -pan.x;
    } else if (rotation === 180) {
      adjustedPanX = -pan.x;
      adjustedPanY = -pan.y;
    } else if (rotation === 270) {
      adjustedPanX = -pan.y;
      adjustedPanY = pan.x;
    }

    ctx.translate(adjustedPanX, adjustedPanY);
    ctx.scale(zoom, zoom);

    ctx.drawImage(
      image,
      -baseWidth / 2,
      -baseHeight / 2,
      baseWidth,
      baseHeight
    );

    ctx.restore();
  }, [image, pan, zoom, rotation]);

  useEffect(() => {
    if (!loading && image) {
      drawPreview();
    }
  }, [drawPreview, loading, image]);

  // Unified Pointer pan handling (mouse, touch & stylus on iOS/Android/Desktop)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (loading || loadError) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    setIsDragging(false);
  };

  // Pinch-to-zoom handling for 2-finger multi-touch
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchDistance(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistance !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchDistance;
      setZoom((prev) => Math.min(3.5, Math.max(0.6, Number((prev * factor).toFixed(2)))));
      setTouchDistance(dist);
    }
  };

  const handleTouchEnd = () => {
    setTouchDistance(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((z) => Math.min(3.5, Math.max(0.6, Number((z + delta).toFixed(2)))));
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleApply = useCallback(() => {
    if (!image) return;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = OUTPUT_SIZE;
    outCanvas.height = OUTPUT_SIZE;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const scaleRatio = OUTPUT_SIZE / PREVIEW_SIZE;

    const imgAspect = image.width / image.height;
    let baseWidth = OUTPUT_SIZE;
    let baseHeight = OUTPUT_SIZE;

    if (imgAspect >= 1) {
      baseHeight = OUTPUT_SIZE;
      baseWidth = OUTPUT_SIZE * imgAspect;
    } else {
      baseWidth = OUTPUT_SIZE;
      baseHeight = OUTPUT_SIZE / imgAspect;
    }

    ctx.save();
    ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    let adjustedPanX = pan.x * scaleRatio;
    let adjustedPanY = pan.y * scaleRatio;
    if (rotation === 90) {
      adjustedPanX = pan.y * scaleRatio;
      adjustedPanY = -pan.x * scaleRatio;
    } else if (rotation === 180) {
      adjustedPanX = -pan.x * scaleRatio;
      adjustedPanY = -pan.y * scaleRatio;
    } else if (rotation === 270) {
      adjustedPanX = -pan.y * scaleRatio;
      adjustedPanY = pan.x * scaleRatio;
    }

    ctx.translate(adjustedPanX, adjustedPanY);
    ctx.scale(zoom, zoom);

    ctx.drawImage(
      image,
      -baseWidth / 2,
      -baseHeight / 2,
      baseWidth,
      baseHeight
    );
    ctx.restore();

    // Export with quality 0.75 for reliable storage in Google Sheets
    const dataUrl = outCanvas.toDataURL('image/jpeg', 0.75);
    onCropComplete(dataUrl);
  }, [image, pan, zoom, rotation, onCropComplete]);

  return (
    <div className="fixed inset-0 z-[9999] bg-stone-950/80 dark:bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#fffefb] dark:bg-[#1f1d1b] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl w-full max-w-sm overflow-hidden flex flex-col font-sans">
        {/* Top Header - Modern Sleek */}
        <div className="bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 px-4 py-3 flex items-center justify-between text-white shadow-xs">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-white/90" />
            <h3 className="text-sm font-bold tracking-tight">Adjust & Crop Photo</h3>
          </div>
          <button
            onClick={onCancel}
            type="button"
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-4 flex flex-col items-center">
          {/* Interactive Canvas Container with Circular Avatar Mask */}
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            style={{ width: `${PREVIEW_SIZE}px`, height: `${PREVIEW_SIZE}px`, touchAction: 'none' }}
            className="relative bg-slate-950 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none shadow-lg border-2 border-stone-300 dark:border-stone-700 flex items-center justify-center touch-none"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center text-white/80 gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
                <span className="text-xs">Loading image...</span>
              </div>
            ) : loadError ? (
              <div className="text-center p-4 text-rose-300 text-xs">
                Could not load image. Please select another file.
              </div>
            ) : (
              <>
                <canvas
                  ref={canvasRef}
                  style={{ width: `${PREVIEW_SIZE}px`, height: `${PREVIEW_SIZE}px` }}
                  className="block pointer-events-none select-none"
                />

                {/* Circular Profile Avatar Cutout */}
                <div className="absolute inset-0 pointer-events-none">
                  <div
                    className="w-full h-full"
                    style={{
                      boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.45)',
                      borderRadius: '50%',
                      border: '2px solid rgba(255, 255, 255, 0.9)',
                      margin: '10px',
                      width: 'calc(100% - 20px)',
                      height: 'calc(100% - 20px)',
                    }}
                  />
                </div>

                {/* Help tip */}
                <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
                  <span className="text-[10px] bg-black/60 text-white/90 px-2 py-0.5 rounded-full font-medium backdrop-blur-xs">
                    Drag to move • Pinch to zoom
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Controls: Zoom slider & Action Buttons */}
          <div className="w-full mt-3.5 space-y-3 px-1">
            {/* Zoom Slider */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))}
                disabled={loading || loadError}
                className="p-1.5 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <input
                type="range"
                min="0.6"
                max="3.0"
                step="0.05"
                value={zoom}
                disabled={loading || loadError}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-40"
              />

              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.1).toFixed(2))))}
                disabled={loading || loadError}
                className="p-1.5 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono font-semibold text-stone-600 dark:text-stone-300 w-11 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Quick Action Buttons: Rotate & Center */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleRotate}
                disabled={loading || loadError}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition-colors cursor-pointer active:scale-95 disabled:opacity-40"
              >
                <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                <span>Rotate 90°</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={loading || loadError}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition-colors cursor-pointer active:scale-95 disabled:opacity-40"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Center</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-stone-50 dark:bg-stone-900/60 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={loading || loadError}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md rounded-xl transition-all cursor-pointer disabled:opacity-40"
          >
            <Check className="w-4 h-4" />
            <span>Save Photo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
