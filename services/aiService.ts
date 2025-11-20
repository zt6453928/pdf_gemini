import { ApiConfig } from "../types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const translatePageContent = async (base64Image: string, config: ApiConfig): Promise<string> => {
  const MAX_RETRIES = 3;
  let lastError: any;

  // Validate Config
  if (!config.apiKey) {
    throw new Error("API Key is missing. Please configure it in settings.");
  }

  try {
    // Clean the base64 string if it has the prefix (OpenAI API usually accepts data URLs, 
    // but sometimes raw base64 depending on the proxy. We will construct a standard data URL)
    // Ensure we have a valid data URL prefix
    let imageUrl = base64Image;
    if (!base64Image.startsWith('data:')) {
      imageUrl = `data:image/jpeg;base64,${base64Image}`;
    }

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

    // Smart URL Construction Logic
    // This handles cases where users paste root domains (e.g. https://529961.com) 
    // and ensures we target the correct OpenAI-compatible endpoint (/v1/chat/completions).
    
    let url = config.baseUrl.trim();
    // Remove trailing slash
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }

    let endpoint = url;
    
    // If it's a full URL to the endpoint, use it.
    if (url.endsWith('/chat/completions')) {
        endpoint = url;
    } 
    // If it ends in /v1, append the chat path
    else if (url.endsWith('/v1')) {
        endpoint = `${url}/chat/completions`;
    } 
    // Otherwise, assume it's a root base URL and append standard OpenAI version + path
    // This specifically fixes the issue for providers like 529961.com
    else {
        endpoint = `${url}/v1/chat/completions`;
    }

    console.log(`[Translation] Using API Endpoint: ${endpoint}`);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: config.modelName,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { 
                    type: "image_url", 
                    image_url: { 
                      url: imageUrl,
                      detail: "high"
                    } 
                  }
                ]
              }
            ],
            max_tokens: 4096,
            temperature: 0.3
          })
        });

        // 1. Check response status
        if (!response.ok) {
          const status = response.status;
          const errorText = await response.text();
          
          let detailedMsg = errorText;
          try {
            const json = JSON.parse(errorText);
            // Extract useful message from common provider formats (Standard OpenAI or Proxies)
            detailedMsg = json.error?.message || json.message || JSON.stringify(json);
          } catch (e) { 
            // Keep raw text if not JSON (e.g. HTML error pages)
            detailedMsg = errorText.substring(0, 300);
          }

          // Create specific error to be caught below
          const errorMessage = `API Error ${status}: ${detailedMsg}`;
          const error = new Error(errorMessage);
          (error as any).status = status;
          throw error;
        }

        // 2. Check Content-Type before parsing JSON
        // This catches the "Unexpected token <" error when a 200 OK response returns HTML (e.g., some proxies or login pages)
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
           const text = await response.text();
           throw new Error(`Invalid API Response: Expected JSON but got '${contentType}'. URL: ${endpoint}. Response preview: ${text.substring(0, 150)}...`);
        }

        const data = await response.json();
        let text = data.choices?.[0]?.message?.content || '';
        
        if (!text) {
            if (data.choices?.[0]?.finish_reason === 'content_filter') {
                throw new Error("Content was filtered by the AI provider.");
            }
            throw new Error("Empty response from API. The model might not support image inputs or the prompt.");
        }

        // Cleanup if the model ignores instructions and adds markdown blocks
        text = text.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        
        // FIX: Unescape common formatting tags that might have been escaped by the model.
        text = text
          .replace(/&lt;(sup|sub|b|i|strong|em)&gt;/gi, '<$1>')
          .replace(/&lt;\/(sup|sub|b|i|strong|em)&gt;/gi, '</$1>');
        
        return text;

      } catch (error: any) {
        console.warn(`Attempt ${attempt} failed:`, error);
        
        // CRITICAL: Abort retries immediately on Authentication/Configuration errors
        const status = error.status;
        
        // 401: Unauthorized (Invalid API Key)
        // 403: Forbidden (Insufficient Quota or Access)
        // 404: Not Found (Invalid URL Endpoint)
        // 400: Bad Request (Invalid Model or Parameters)
        if (status === 401 || status === 403 || status === 404 || status === 400) {
            throw error; // Do not retry, fail immediately
        }

        lastError = error;
        if (attempt < MAX_RETRIES) {
          // Exponential backoff: 1s, 2s, 4s...
          await delay(1000 * Math.pow(2, attempt - 1));
        }
      }
    }

    throw lastError;

  } catch (error) {
    console.error("Translation Error:", error);
    throw error; // Propagate error to the UI
  }
};