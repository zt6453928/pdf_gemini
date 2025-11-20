import React, { useState, useEffect } from 'react';
import { Settings, X, Save, RotateCcw, Server, Key, Box } from 'lucide-react';
import { ApiConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ApiConfig;
  onSave: (config: ApiConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<ApiConfig>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const handleReset = () => {
    setLocalConfig({
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      modelName: 'gpt-4o'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fade-in">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-800">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-lg">Settings</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Translation Provider
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setLocalConfig({ ...localConfig, provider: 'openai' })}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  localConfig.provider === 'openai' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                OpenAI / Vision
              </button>
              <button
                onClick={() => setLocalConfig({ ...localConfig, provider: 'deeplx' })}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  localConfig.provider === 'deeplx' 
                    ? 'bg-white text-purple-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                DeepLX
              </button>
            </div>
          </div>

          {localConfig.provider === 'openai' ? (
            <>
              {/* OpenAI Settings */}
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <Server size={16} className="text-gray-400"/>
                    API Base URL
                  </label>
                  <input
                    type="text"
                    value={localConfig.baseUrl}
                    onChange={(e) => setLocalConfig({ ...localConfig, baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    e.g. <code>https://529961.com</code> or <code>https://api.openai.com/v1</code>
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <Key size={16} className="text-gray-400"/>
                    API Key
                  </label>
                  <input
                    type="password"
                    value={localConfig.apiKey}
                    onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <Box size={16} className="text-gray-400"/>
                    Model Name
                  </label>
                  <input
                    type="text"
                    value={localConfig.modelName}
                    onChange={(e) => setLocalConfig({ ...localConfig, modelName: e.target.value })}
                    placeholder="gpt-4o"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* DeepLX Settings */}
              <div className="space-y-4 animate-fade-in">
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-xs text-purple-800 mb-2">
                  <strong>Note:</strong> DeepLX is text-only. Layout, tables, and images will not be visually preserved as well as Vision models.
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <Server size={16} className="text-gray-400"/>
                    DeepLX Endpoint
                  </label>
                  <input
                    type="text"
                    value={localConfig.baseUrl}
                    onChange={(e) => setLocalConfig({ ...localConfig, baseUrl: e.target.value })}
                    placeholder="http://localhost:1188/translate"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    URL to your DeepLX instance (must handle POST /translate).
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <Key size={16} className="text-gray-400"/>
                    Access Token (Optional)
                  </label>
                  <input
                    type="password"
                    value={localConfig.apiKey}
                    onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
                    placeholder="Leave empty if not required"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-mono"
                  />
                </div>
              </div>
            </>
          )}

        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <button 
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md active:transform active:scale-95 ${
              localConfig.provider === 'deeplx' 
                ? 'bg-purple-600 hover:bg-purple-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Save size={16} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};