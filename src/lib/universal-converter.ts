import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import html2pdf from 'html2pdf.js';
import { ConvertedFile } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const generateId = () => Math.random().toString(36).substring(2, 9);

export async function processConversion(file: File, targetExt: string, onProgress?: (progress: number) => void): Promise<ConvertedFile> {
  const originalExt = file.name.split('.').pop()?.toLowerCase() || '';
  const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  const targetName = `${baseName}.${targetExt}`;
  
  if (onProgress) onProgress(5);
  
  // 1. DATA & SPREADSHEETS
  const dataFormats = ['xlsx', 'xls', 'csv', 'json', 'xml', 'ods'];
  if (dataFormats.includes(originalExt) && dataFormats.includes(targetExt)) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    let blob: Blob;
    if (targetExt === 'json') {
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(firstSheet);
      blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    } else if (targetExt === 'csv') {
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const csv = XLSX.utils.sheet_to_csv(firstSheet);
      blob = new Blob([csv], { type: 'text/csv' });
    } else if (targetExt === 'xml') {
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(firstSheet);
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<data>\n${json.map(row => 
        `  <row>\n${Object.entries(row).map(([k, v]) => `    <${k.replace(/\s+/g, '_')}>${v}</${k.replace(/\s+/g, '_')}>`).join('\n')}\n  </row>`
      ).join('\n')}\n</data>`;
      blob = new Blob([xml], { type: 'application/xml' });
    } else {
      const out = XLSX.write(workbook, { bookType: targetExt as any, type: 'array' });
      blob = new Blob([out], { type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` });
    }
    return { id: generateId(), originalName: file.name, convertedName: targetName, blob, size: blob.size, type: blob.type, url: URL.createObjectURL(blob) };
  }

  // 2. IMAGES
  const imageFormats = ['png', 'jpg', 'jpeg', 'webp', 'bmp'];
  if ((imageFormats.includes(originalExt) || ['gif', 'svg'].includes(originalExt)) && imageFormats.includes(targetExt)) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas error');
        
        if (targetExt === 'jpg' || targetExt === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        
        let mime = `image/${targetExt === 'jpg' ? 'jpeg' : targetExt}`;
        canvas.toBlob((b) => {
          URL.revokeObjectURL(url);
          if (!b) return reject('Blob error');
          resolve({ id: generateId(), originalName: file.name, convertedName: targetName, blob: b, size: b.size, type: b.type, url: URL.createObjectURL(b) });
        }, mime, 0.9);
      };
      img.onerror = () => reject('Image load failed');
      img.src = url;
    });
  }

  // 3. DOCUMENTS (Preserving Formatting via HTML)
  const docFormats = ['pdf', 'docx', 'doc', 'txt', 'rtf', 'odt', 'epub', 'html'];
  if (docFormats.includes(originalExt) && docFormats.includes(targetExt)) {
    let extractedHtml = '';
    
    if (originalExt === 'pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let htmlString = '<div style="font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #000;">';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        
        // Yield to main thread to prevent UI freezing on heavy PDFs
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // Group items roughly by Y-coordinate to recreate lines/paragraphs and preserve layout
        let lastY = -1;
        let line = '';
        content.items.forEach((item: any) => {
          const y = Math.round(item.transform[5]);
          if (lastY !== -1 && Math.abs(y - lastY) > 6) { 
            htmlString += `<p style="margin: 0 0 8px 0;">${line}</p>`;
            line = item.str;
          } else {
            line += (line.length > 0 && !line.endsWith(' ') && !item.str.startsWith(' ') ? ' ' : '') + item.str;
          }
          lastY = y;
        });
        if (line) htmlString += `<p style="margin: 0 0 8px 0;">${line}</p>`;
        if (i < pdf.numPages) htmlString += '<div style="page-break-after: always; height: 1px;"></div>';
        
        if (onProgress) {
          // Progress from 5% up to 80% during text extraction
          onProgress(5 + Math.round((i / pdf.numPages) * 75));
        }
      }
      htmlString += '</div>';
      extractedHtml = htmlString;
    } else if (originalExt === 'docx') {
      // Use convertToHtml instead of extractRawText to preserve styles, bold, tables, etc.
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      extractedHtml = `<div style="font-family: sans-serif; color: #000;">${result.value}</div>`;
    } else if (originalExt === 'html') {
      extractedHtml = await file.text();
    } else {
      // TXT, RTF
      const text = await file.text();
      extractedHtml = `<div style="font-family: sans-serif; color: #000; white-space: pre-wrap;">${text}</div>`;
    }
    
    let blob: Blob;
    if (targetExt === 'pdf') {
      if (onProgress) onProgress(85);
      return new Promise((resolve, reject) => {
        const container = document.createElement('div');
        container.innerHTML = extractedHtml;
        container.style.width = '800px';
        container.style.padding = '20px';
        container.style.background = '#FFFFFF';
        container.style.color = '#000000';
        document.body.appendChild(container); // Mount temporarily

        html2pdf().from(container).set({
          margin: 15,
          filename: targetName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).outputPdf('blob').then((pdfBlob: Blob) => {
          document.body.removeChild(container); // Cleanup
          if (onProgress) onProgress(100);
          resolve({ id: generateId(), originalName: file.name, convertedName: targetName, blob: pdfBlob, size: pdfBlob.size, type: pdfBlob.type, url: URL.createObjectURL(pdfBlob) });
        }).catch((err: any) => {
          if (container.parentNode) document.body.removeChild(container);
          reject(err);
        });
      });
    } else if (targetExt === 'docx' || targetExt === 'doc') {
      // Wrap HTML so Word natively renders it with preserved layout
      const wordHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Export</title></head>
        <body>${extractedHtml}</body>
        </html>
      `;
      blob = new Blob([wordHtml], { type: 'application/msword' });
    } else if (targetExt === 'txt') {
      const temp = document.createElement('div');
      temp.innerHTML = extractedHtml;
      blob = new Blob([temp.innerText || temp.textContent || ''], { type: 'text/plain' });
    } else {
      blob = new Blob([extractedHtml], { type: 'text/html' });
    }
    
    if (onProgress) onProgress(100);
    return { id: generateId(), originalName: file.name, convertedName: targetName, blob, size: blob.size, type: blob.type, url: URL.createObjectURL(blob) };
  }

  // 4. UNSUPPORTED / SYSTEM FALLBACK
  throw new Error('Conversion between these specific formats is structurally limited in browser-only mode.');
}
