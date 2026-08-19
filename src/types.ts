export type PageType = 'documents' | 'data' | 'images' | 'system';

export interface ConvertedFile {
  id: string;
  originalName: string;
  convertedName: string;
  blob: Blob;
  size: number;
  type: string;
  url: string;
}
