/**
 * Image processing utilities for PDF/HTML export
 */

/**
 * Convert image URL to base64 for embedding in PDF
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return '';
  }
}

/**
 * Calculate image dimensions to fit within max width while maintaining aspect ratio
 */
export function calculateImageDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number = 500
): { width: number; height: number } {
  if (originalWidth <= maxWidth) {
    return { width: originalWidth, height: originalHeight };
  }
  
  const ratio = maxWidth / originalWidth;
  return {
    width: maxWidth,
    height: Math.round(originalHeight * ratio)
  };
}

/**
 * Get image dimensions from URL
 */
export async function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Process attachments for export
 */
export async function processAttachmentsForExport(attachments: any[] = []): Promise<any[]> {
  const processed = [];
  
  for (const attachment of attachments) {
    if (attachment.type === 'image') {
      try {
        // Use annotated version if available
        const imageUrl = attachment.annotations || attachment.blobUrl || attachment.driveUrl || attachment.data;
        
        // For PDF, convert to base64
        const base64 = await imageUrlToBase64(imageUrl);
        if (base64) {
          const dimensions = await getImageDimensions(imageUrl);
          const scaled = calculateImageDimensions(dimensions.width, dimensions.height);
          
          processed.push({
            id: attachment.id,
            type: 'image',
            data: base64,
            width: scaled.width,
            height: scaled.height,
            fileName: attachment.fileName
          });
        }
      } catch (error) {
        console.error('Error processing image attachment:', error);
      }
    }
  }
  
  return processed;
}