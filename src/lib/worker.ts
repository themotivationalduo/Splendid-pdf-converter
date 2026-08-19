/// <reference lib="webworker" />
import { PDFDocument } from 'pdf-lib';

self.addEventListener('message', async (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  if (type === 'IMAGES_TO_PDF') {
    try {
      const pdfDoc = await PDFDocument.create();
      
      for (const { buffer, mimeType } of payload.files) {
        let pdfImage;
        if (mimeType === 'image/jpeg') {
          pdfImage = await pdfDoc.embedJpg(buffer);
        } else if (mimeType === 'image/png') {
          pdfImage = await pdfDoc.embedPng(buffer);
        } else {
          continue;
        }
        
        const page = pdfDoc.addPage([pdfImage.width, pdfImage.height]);
        page.drawImage(pdfImage, {
          x: 0,
          y: 0,
          width: pdfImage.width,
          height: pdfImage.height,
        });
      }
      
      const pdfBytes = await pdfDoc.save();
      
      self.postMessage({ id, status: 'success', result: pdfBytes.buffer }, [pdfBytes.buffer]);
    } catch (error: any) {
      self.postMessage({ id, status: 'error', error: error.message });
    }
  }
});
