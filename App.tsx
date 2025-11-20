import React, { useState, useCallback, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { TranslationViewer } from './components/TranslationViewer';
import { SettingsModal } from './components/SettingsModal';
import { loadPdf, renderPageToImage, getTotalPages } from './services/pdfService';
import { translatePageContent } from './services/aiService';
import { AppState, TranslatedPage, ApiConfig } from './types';
import { Languages, ShieldCheck, Zap, Settings } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [translatedPages, setTranslatedPages] = useState<TranslatedPage[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Default Configuration
  // Try to load from LocalStorage first, otherwise defaults
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => {
    const saved = localStorage.getItem('pdf_translate_config');
    return saved ? JSON.parse(saved) : {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '', // User must provide this
      modelName: 'gpt-4o'
    };
  });

  const handleSaveSettings = (newConfig: ApiConfig) => {
    setApiConfig(newConfig);
    localStorage.setItem('pdf_translate_config', JSON.stringify(newConfig));
  };

  const processPDF = useCallback(async (file: File) => {
    if (!apiConfig.apiKey) {
      alert("Please configure your API Key in settings before proceeding.");
      setIsSettingsOpen(true);
      return;
    }

    setAppState(AppState.PROCESSING);
    setTranslatedPages([]);
    
    try {
      const pdf = await loadPdf(file);
      const totalPages = getTotalPages(pdf);
      setProgress({ current: 0, total: totalPages });

      // Initialize pages array
      const initialPages: TranslatedPage[] = Array.from({ length: totalPages }, (_, i) => ({
        pageNumber: i + 1,
        originalImage: '',
        translatedHtml: '',
        status: 'pending'
      }));
      setTranslatedPages(initialPages);
      
      for (let i = 0; i < totalPages; i++) {
        // 1. Render Image
        const imageBase64 = await renderPageToImage(pdf, i + 1);
        
        setTranslatedPages(prev => {
          const next = [...prev];
          next[i] = { ...next[i], originalImage: imageBase64, status: 'translating' };
          return next;
        });

        // 2. Translate with AI Service using Config
        try {
          const translation = await translatePageContent(imageBase64, apiConfig);

          setTranslatedPages(prev => {
            const next = [...prev];
            next[i] = { 
              ...next[i], 
              translatedHtml: translation, 
              status: 'completed' 
            };
            return next;
          });
        } catch (pageError) {
           setTranslatedPages(prev => {
            const next = [...prev];
            next[i] = { 
              ...next[i], 
              status: 'error',
              errorMessage: pageError instanceof Error ? pageError.message : 'Unknown error'
            };
            return next;
          });
        }
        
        setProgress(prev => ({ ...prev, current: i + 1 }));
      }

      setAppState(AppState.COMPLETED);

    } catch (error) {
      console.error("Processing Error", error);
      setAppState(AppState.ERROR);
      alert("An error occurred while processing the PDF.");
    }
  }, [apiConfig]);

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 text-slate-900">
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        config={apiConfig}
        onSave={handleSaveSettings}
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Languages size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">PDF Translate Pro</h1>
            <p className="text-xs text-gray-500 font-medium">
              {apiConfig.modelName} @ {new URL(apiConfig.baseUrl).hostname}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600 mr-4">
            <div className="flex items-center gap-2">
               <ShieldCheck size={16} className="text-green-600" />
               <span>Secure Processing</span>
            </div>
            <div className="flex items-center gap-2">
               <Zap size={16} className="text-amber-500" />
               <span>Layout Preservation</span>
            </div>
          </div>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {appState === AppState.IDLE || appState === AppState.ERROR ? (
          <div className="h-full flex flex-col items-center justify-center p-6">
             <div className="w-full max-w-2xl">
                <div className="text-center mb-10">
                  <h2 className="text-4xl font-bold text-slate-900 mb-4">
                    Translate PDFs instantly.
                  </h2>
                  <p className="text-lg text-slate-600">
                    Upload any PDF document. We'll translate it to Chinese while keeping the original structure, tables, and formatting intact using AI.
                  </p>
                </div>
                
                <FileUploader 
                  onFileSelect={processPDF} 
                  isProcessing={false} 
                />
                
                {!apiConfig.apiKey && (
                  <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg text-sm text-center">
                    ⚠️ You need to configure your API Key in <strong>Settings</strong> before uploading.
                  </div>
                )}

                {appState === AppState.ERROR && (
                  <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-center">
                    Something went wrong. Please check your API connection or try a different file.
                  </div>
                )}
             </div>
          </div>
        ) : appState === AppState.PROCESSING ? (
          <div className="h-full flex flex-col items-center justify-center p-6 bg-white">
             <div className="w-full max-w-md text-center space-y-8">
                <div className="relative mx-auto w-24 h-24">
                   <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Translating Document</h3>
                  <p className="text-gray-500">
                    Processing page {progress.current + 1} of {progress.total}...
                  </p>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full transition-all duration-500 ease-out"
                    style={{ width: `${((progress.current) / Math.max(progress.total, 1)) * 100}%` }}
                  ></div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-8">
                  <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl">
                    <span className="text-xs font-semibold text-gray-400 uppercase mb-1">Status</span>
                    <span className="font-medium text-blue-600">Active</span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl">
                    <span className="text-xs font-semibold text-gray-400 uppercase mb-1">Pages</span>
                    <span className="font-medium text-gray-900">{progress.total}</span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl">
                    <span className="text-xs font-semibold text-gray-400 uppercase mb-1">Model</span>
                    <span className="font-medium text-gray-900 truncate max-w-[100px]">{apiConfig.modelName}</span>
                  </div>
                </div>
             </div>
          </div>
        ) : (
          <TranslationViewer 
            pages={translatedPages}
            onReset={() => setAppState(AppState.IDLE)}
            onDownload={() => {}} // handled internally in Viewer
          />
        )}
      </main>
    </div>
  );
};

export default App;