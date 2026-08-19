import { PDFDocument } from 'pdf-lib';
import { ConvertedFile } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 9);

export async function convertImage(file: File, format: 'image/png' | 'image/jpeg' | 'image/webp', quality = 0.9): Promise<ConvertedFile> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Draw white background in case of PNG to JPG
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) {
          reject(new Error('Blob conversion failed'));
          return;
        }
        
        const ext = format.split('/')[1];
        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const convertedName = `${baseName}.${ext}`;
        
        resolve({
          id: generateId(),
          originalName: file.name,
          convertedName,
          blob,
          size: blob.size,
          type: blob.type,
          url: URL.createObjectURL(blob),
        });
      }, format, quality);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };
    
    img.src = url;
  });
}

export async function imagesToPdf(files: File[]): Promise<ConvertedFile> {
  return new Promise(async (resolve, reject) => {
    try {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      
      const fileBuffers = await Promise.all(
        files.map(async (f) => ({
          buffer: await f.arrayBuffer(),
          mimeType: f.type,
        }))
      );
      
      const messageId = generateId();
      
      worker.onmessage = (e) => {
        if (e.data.id === messageId) {
          if (e.data.status === 'success') {
            const blob = new Blob([e.data.result], { type: 'application/pdf' });
            
            const convertedName = files.length === 1 
              ? `${files[0].name.substring(0, files[0].name.lastIndexOf('.'))}.pdf` 
              : `converted_${Date.now()}.pdf`;
              
            resolve({
              id: generateId(),
              originalName: files.length === 1 ? files[0].name : `${files.length} images`,
              convertedName,
              blob,
              size: blob.size,
              type: 'application/pdf',
              url: URL.createObjectURL(blob),
            });
          } else {
            reject(new Error(e.data.error));
          }
          worker.terminate();
        }
      };
      
      worker.onerror = (err) => {
        reject(err);
        worker.terminate();
      };
      
      // We pass the ArrayBuffers as transferable objects for performance
      const transferables = fileBuffers.map((f) => f.buffer);
      worker.postMessage(
        { type: 'IMAGES_TO_PDF', payload: { files: fileBuffers }, id: messageId },
        transferables
      );
    } catch (err) {
      reject(err);
    }
  });
}
