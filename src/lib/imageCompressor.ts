/**
 * Client-side image compressor & square avatar processor.
 * Fully compatible with iPhone iOS Safari, Android, and Desktop browsers.
 */

export interface CropSettings {
  zoom: number;
  rotation: number; // 0, 90, 180, 270
  panX: number;
  panY: number;
}

/**
 * Automatically loads and processes any image file/blob into a crisp 1:1 square avatar data URL.
 * Automatically center-crops, scales down, and compresses to compact JPEG (~12-18KB).
 */
export async function processSquareAvatarImage(
  fileOrBlob: File | Blob,
  targetSize = 220,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read image file from your device.'));
    };

    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();

      img.onerror = () => {
        reject(new Error('Could not load image format. Please choose another photo.'));
      };

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context is not available.'));
            return;
          }

          // Clean white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetSize, targetSize);

          // Center-crop 1:1 square
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(
            img,
            sx,
            sy,
            minDim,
            minDim,
            0,
            0,
            targetSize,
            targetSize
          );

          const finalDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(finalDataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Backward compatibility alias
 */
export const compressImageFile = processSquareAvatarImage;
