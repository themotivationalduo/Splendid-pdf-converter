import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import { ConvertedFile } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const generateId = () => Math.random().toString(36).substring(2, 9);

export async function processConversion(file: File, targetExt: string): Promise<ConvertedFile> {
  const originalExt = file.name.split('.').pop()?.toLowerCase() || '';
  const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  const targetName = `${baseName}.${targetExt}`;
  
  // 1. DATA & SPREADSHEETS (using xlsx)
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
      // Basic XML wrapper
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(firstSheet);
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<data>\n${json.map(row => 
        `  <row>\n${Object.entries(row).map(([k, v]) => `    <${k.replace(/\s+/g, '_')}>${v}</${k.replace(/\s+/g, '_')}>`).join('\n')}\n  </row>`
      ).join('\n')}\n</data>`;
      blob = new Blob([xml], { type: 'application/xml' });
    } else {
      // xlsx, ods
      const out = XLSX.write(workbook, { bookType: targetExt as any, type: 'array' });
      blob = new Blob([out], { type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` });
    }
    
    return { id: generateId(), originalName: file.name, convertedName: targetName, blob, size: blob.size, type: blob.type, url: URL.createObjectURL(blob) };
  }

  // 2. IMAGES (using Canvas)
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

  // 3. DOCUMENTS (PDF, DOCX, TXT)
  const docFormats = ['pdf', 'docx', 'doc', 'txt', 'rtf', 'odt', 'epub', 'html'];
  if (docFormats.includes(originalExt) && docFormats.includes(targetExt)) {
    let extractedText = '';
    
    // Extract text from source
    if (originalExt === 'pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        extractedText += content.items.map((it: any) => it.str).join(' ') + '\n';
      }
    } else if (originalExt === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      extractedText = result.value;
    } else {
      // TXT, HTML, RTF, etc (best effort text read)
      extractedText = await file.text();
    }
    
    // Write to target
    let blob: Blob;
    if (targetExt === 'pdf') {
      const doc = new jsPDF();
      const splitText = doc.splitTextToSize(extractedText, 180);
      let y = 10;
      for (let i = 0; i < splitText.length; i++) {
        if (y > 280) { doc.addPage(); y = 10; }
        doc.text(splitText[i], 10, y);
        y += 7;
      }
      blob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
    } else if (targetExt === 'docx' || targetExt === 'doc') {
      // Basic fallback: saving text as .doc which Word can open
      const htmlContent = `<html><body><pre>${extractedText}</pre></body></html>`;
      blob = new Blob([htmlContent], { type: 'application/msword' });
    } else {
      // TXT, HTML, RTF, etc
      blob = new Blob([extractedText], { type: 'text/plain' });
    }
    
    return { id: generateId(), originalName: file.name, convertedName: targetName, blob, size: blob.size, type: blob.type, url: URL.createObjectURL(blob) };
  }

  // 4. UNSUPPORTED / SYSTEM FALLBACK
  // For Exes, APKs, DMGs, or unknown cross-category conversions
  throw new Error('Conversion between these specific formats is structurally limited in browser-only mode.');
}
