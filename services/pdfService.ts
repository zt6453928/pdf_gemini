import * as pdfjsLib from 'pdfjs-dist';

// Initialize worker
// We use unpkg to ensure we fetch the worker file that matches the version of the library we are using.
// Using the .mjs extension is crucial for modern bundlers and ESM environments to load the worker correctly as a module.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export const loadPdf = async (file: File): Promise<pdfjsLib.PDFDocumentProxy> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  return loadingTask.promise;
};

export const renderPageToImage = async (pdf: pdfjsLib.PDFDocumentProxy, pageNum: number, scale = 1.0): Promise<string> => {
  const page = await pdf.getPage(pageNum);
  
  // Calculate viewport with requested scale
  let viewport = page.getViewport({ scale });
  
  // Safety cap: Limit maximum dimension to prevent payload size issues with the API
  // 768px is sufficient for text recognition while keeping the payload size small to avoid XHR errors
  const MAX_DIMENSION = 768;
  if (viewport.width > MAX_DIMENSION || viewport.height > MAX_DIMENSION) {
    const scaleFactor = Math.min(MAX_DIMENSION / viewport.width, MAX_DIMENSION / viewport.height);
    viewport = page.getViewport({ scale: scale * scaleFactor });
  }
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Could not get canvas context');
  }

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;

  // Return base64 image, clean format
  // Aggressively lower quality to 0.4 to ensure the payload size stays within safe limits for the API (avoiding error code 6)
  const base64 = canvas.toDataURL('image/jpeg', 0.4);
  return base64;
};

export const getTotalPages = (pdf: pdfjsLib.PDFDocumentProxy): number => {
  return pdf.numPages;
};