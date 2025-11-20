import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const translatePageContent = async (base64Image: string): Promise<string> => {
  // Retry configuration
  const MAX_RETRIES = 3;
  let lastError: any;

  try {
    // Clean the base64 string if it has the prefix
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const modelId = 'gemini-2.5-flash'; // Using flash for speed/cost efficiency on vision tasks
    
    const prompt = `
      You are a professional document translator. 
      Translate the content of this image from its original language into Simplified Chinese.
      
      CRITICAL OUTPUT INSTRUCTIONS:
      1. Return ONLY valid HTML code. Do not wrap it in markdown code blocks (like \`\`\`html).
      2. LAYOUT & FORMATTING:
         - Use semantic HTML tags (<h1>, <p>, <ul>) to replicate the visual structure.
         - Use inline CSS for alignment (text-align), font-weight, and basic layout.
      
      3. TABLES (CRITICAL):
         - Detect ALL tables in the document.
         - You MUST reconstruct them using HTML <table>, <tr>, <td>, <th> tags.
         - Preserve column spans (colspan) and row spans (rowspan) to match the original structure exactly.
         - Translate all text content inside the tables.
         - DO NOT replace tables with placeholders.
      
      4. IMAGES & CHARTS:
         - If the image is a Chart, Graph, or Diagram containing data: Convert the visual data into an HTML Table representation so the data is preserved.
         - If the image is a diagram with text: Extract the text and structure it using <div> or lists to preserve the meaning.
         - If the image is a purely decorative photo: Insert a placeholder <div class="image-placeholder">[图片: Description]</div>.
         
      5. TRANSLATION:
         - Translate ALL text content into Simplified Chinese. 
         - Ensure the tone is professional.
         
      6. RESTRICTIONS:
         - DO NOT use Markdown.
         - DO NOT use LaTeX or MathJax (e.g. no $...$ or \[...\]). Use HTML entities for math symbols (e.g. &sum;, &alpha;).
         - DO NOT escape HTML tags (e.g. output <sup>17</sup>, NOT &lt;sup&gt;17&lt;/sup&gt;).
         - DO NOT generate <img src="..."> tags.
         - DO NOT output \`\`\`html or \`\`\`.
      
      7. Do not include <html>, <head>, or <body> tags. Start directly with the content elements.
    `;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: cleanBase64
                }
              },
              {
                text: prompt
              }
            ]
          }
        });

        let text = response.text || '';
        
        // Cleanup if the model ignores instructions and adds markdown blocks
        text = text.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        
        // FIX: Unescape common formatting tags that might have been escaped by the model.
        // This specifically addresses the issue where users see <sup> tags as literal text.
        text = text
          .replace(/&lt;(sup|sub|b|i|strong|em)&gt;/gi, '<$1>')
          .replace(/&lt;\/(sup|sub|b|i|strong|em)&gt;/gi, '</$1>');
        
        return text;

      } catch (error) {
        console.warn(`Attempt ${attempt} failed:`, error);
        lastError = error;
        if (attempt < MAX_RETRIES) {
          // Exponential backoff: 1s, 2s, 4s...
          await delay(1000 * Math.pow(2, attempt - 1));
        }
      }
    }

    throw lastError;

  } catch (error) {
    console.error("Gemini Translation Error:", error);
    return `<div class="text-red-500 p-4 border border-red-200 bg-red-50 rounded">
      <h3 class="font-bold mb-2">Translation failed</h3>
      <p>Could not translate this page after multiple attempts.</p>
      <p class="text-sm mt-2 opacity-75">Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
    </div>`;
  }
};