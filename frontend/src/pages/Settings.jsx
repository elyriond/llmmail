import { useState, useEffect, useRef } from 'react';

function Settings() {
  const [settings, setSettings] = useState(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [messages, setMessages] = useState([]);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (isInitialLoad.current) {
      loadSettings();
      isInitialLoad.current = false;
    }
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/settings');
      const data = await response.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        setWebsiteUrl(data.settings.website_url || '');
        addMessage('assistant', `Settings loaded for ${data.settings.website_url}. Review and edit your brand profile below.`);
      } else {
        addMessage('assistant', "Hi! Let's set up your brand profile. What's your company website URL?");
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      addMessage('assistant', "Hi! Let's set up your brand profile. What's your company website URL?");
    }
  };

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  const handleScanWebsite = async () => {
    if (!websiteUrl.trim()) {
      addMessage('assistant', 'Please enter a valid website URL.');
      return;
    }
    let url = websiteUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    addMessage('user', `Scan ${url}`);
    addMessage('assistant', '🔄 Scanning website... This may take 30-90 seconds.');
    setIsScanning(true);
    try {
      const response = await fetch('http://localhost:3000/api/settings/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
        addMessage('assistant', `✅ Scan complete for ${data.data.brand_name || url}. The brand profile has been populated with the new data.`);
      } else {
        addMessage('assistant', `❌ Scan failed: ${data.error}\n\nPlease check the URL and try again.`);
      }
    } catch (error) {
      addMessage('assistant', `❌ Error: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSettingChange = (path, value) => {
    setSettings(prev => {
      const newSettings = JSON.parse(JSON.stringify(prev)); // Deep copy
      let current = newSettings;
      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = current[path[i]] || {}; // Create nested objects if they don't exist
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newSettings;
    });
  };

  const saveSettings = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await response.json();
      if (data.success) {
        addMessage('assistant', '✅ Settings saved successfully!');
      } else {
        addMessage('assistant', `❌ Save failed: ${data.error}`);
      }
    } catch (error) {
      addMessage('assistant', `❌ Error saving: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      <Header />
      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <ChatPanel
              messages={messages}
              isScanning={isScanning}
              websiteUrl={websiteUrl}
              setWebsiteUrl={setWebsiteUrl}
              handleScanWebsite={handleScanWebsite}
            />
          </div>
          <div className="lg:col-span-3">
            <SettingsForm
              settings={settings}
              setSettings={setSettings}
              saveSettings={saveSettings}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// Sub-components for better organization

const Header = () => (
  <header className="border-b border-white/10 backdrop-blur-sm bg-black/20 sticky top-0 z-10">
    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <a href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-600 rounded-lg flex items-center justify-center text-2xl">✉</div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">LLM-Mail</h1>
            <p className="text-xs text-gray-400">Brand Profile Settings</p>
          </div>
        </a>
      </div>
      <a href="/" className="text-sm text-gray-300 hover:text-white transition-colors">← Back to Editor</a>
    </div>
  </header>
);

const ChatPanel = ({ messages, isScanning, websiteUrl, setWebsiteUrl, handleScanWebsite }) => (
  <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden h-[calc(100vh-140px)] flex flex-col">
    <div className="px-6 py-4 border-b border-white/10 bg-black/20">
      <h2 className="font-semibold text-lg flex items-center gap-2"><span className="text-purple-400">💬</span> Setup Assistant</h2>
    </div>
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.map((msg, i) => <ChatMessage key={i} role={msg.role} content={msg.content} />)}
      {isScanning && <LoadingIndicator />}
    </div>
    <div className="p-6 border-t border-white/10 bg-black/20">
      <label className="block text-sm text-gray-400 mb-2">Website URL</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleScanWebsite()}
          placeholder="example.com"
          disabled={isScanning}
          className="flex-1 px-4 py-2 bg-white/5 text-white border border-white/10 rounded-xl focus:outline-none focus:border-purple-500 transition-all placeholder:text-gray-500 disabled:opacity-50"
        />
        <button onClick={handleScanWebsite} disabled={isScanning} className="px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl font-medium transition-all disabled:opacity-50">
          {isScanning ? '⏳' : '🔍'} Scan
        </button>
      </div>
    </div>
  </div>
);

const ChatMessage = ({ role, content }) => {
  const isImageUrl = typeof content === 'string' && content.startsWith('data:image');

  return (
    <div className={`flex items-start gap-3 ${role === 'user' ? 'justify-end' : ''}`}>
      {role === 'assistant' && <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">🤖</div>}
      <div className={`rounded-xl p-4 max-w-[85%] ${role === 'user' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/5 border border-white/10'}`}>
        {isImageUrl ? (
          <img src={content} alt="Generated Image" className="max-w-full h-auto rounded-lg" />
        ) : (
          <p className="text-sm whitespace-pre-line">{content}</p>
        )}
      </div>
      {role === 'user' && <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0">👤</div>}
    </div>
  );
};

const LoadingIndicator = () => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">🤖</div>
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex gap-2">
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  </div>
);

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SettingsForm = ({ settings, setSettings, saveSettings }) => {
  const [isEditing, setIsEditing] = useState(true);

  const handleWebsiteUrlChange = (value) => {
    setSettings(prev => ({
      ...prev,
      website_url: value
    }));
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden h-[calc(100vh-140px)] flex flex-col">
      <div className="px-6 py-4 border-b border-white/10 bg-black/20 flex items-center justify-between">
        <h2 className="font-semibold text-lg flex items-center gap-2"><span className="text-purple-400">⚙️</span> Brand Profile (Markdown)</h2>
        <div className="flex items-center gap-4">
          {settings && (
            <button onClick={() => setIsEditing(!isEditing)} className="px-4 py-2 bg-black/20 border border-white/10 hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
              {isEditing ? '👁️ Preview' : '✏️ Edit'}
            </button>
          )}
          {settings && <button onClick={saveSettings} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg text-sm font-medium transition-all">💾 Save Changes</button>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {!settings ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🌐</p>
            <p>Enter your website URL to scan and populate your brand profile.</p>
          </div>
        ) : (
          <>
            <InputField label="Website URL" value={settings.website_url} onChange={handleWebsiteUrlChange} />
            <div>
              <label className="block text-sm text-gray-400 mb-1">Full Scan Data (Markdown)</label>
              {isEditing ? (
                <TextAreaField
                  value={settings.full_scan_markdown || ''}
                  onChange={(value) => setSettings(prev => ({ ...prev, full_scan_markdown: value }))}
                  rows={25}
                />
              ) : (
                <div className="prose prose-invert bg-white/5 border border-white/10 rounded-lg p-4 max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {settings.full_scan_markdown || ''}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const InputField = ({ label, value, onChange }) => (
  <div>
    <label className="block text-sm text-gray-400 mb-1">{label}</label>
    <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-sm" />
  </div>
);

const TextAreaField = ({ label, value, onChange, rows = 3 }) => (
  <div>
    <label className="block text-sm text-gray-400 mb-1">{label}</label>
    <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-sm resize-y" />
  </div>
);

export default Settings;
