import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const normalizeDressipiDomain = (raw) => {
  if (!raw) return '';
  const trimmed = raw.trim().replace(/^\s*https?:\/\//i, '').replace(/\/+$/, '');
  if (/^dressipi\./i.test(trimmed)) {
    return `www.${trimmed}`;
  }
  if (!/^www\./i.test(trimmed) && trimmed.includes('.dressipi.')) {
    return `www.${trimmed}`;
  }
  return trimmed;
};

function Settings() {
  const location = useLocation();
  const [settings, setSettings] = useState(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [messages, setMessages] = useState([]);
  const isInitialLoad = useRef(true);

  const [dressipiDomain, setDressipiDomain] = useState('');
  const [dressipiTestItemId, setDressipiTestItemId] = useState('');
  const [dressipiResults, setDressipiResults] = useState(null);
  const [isLoadingDressipi, setIsLoadingDressipi] = useState(false);
  const [dressipiError, setDressipiError] = useState('');
  const [dressipiLastRequest, setDressipiLastRequest] = useState('');
  const dressipiReadyRef = useRef(false);
  const dressipiSaveTimeout = useRef(null);

  const addMessage = useCallback((role, content) => {
    setMessages(prev => [...prev, { role, content }]);
  }, []);

  const persistDressipiSettings = useCallback(async (domainToSave, seedToSave) => {
    try {
      const payload = {
        dressipi: {
          domain: domainToSave ? normalizeDressipiDomain(domainToSave) : null,
          seed_item_id: seedToSave ? seedToSave.trim() : null
        }
      };

      const response = await fetch('http://localhost:3000/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save Dressipi settings');
      }
    } catch (error) {
      console.error('Dressipi settings save error:', error);
      addMessage('assistant', `⚠️ Warning: Failed to save Dressipi settings automatically (${error.message}).`);
    }
  }, [addMessage]);

  useEffect(() => {
    if (!dressipiReadyRef.current) return;

    if (dressipiDomain) {
      localStorage.setItem('dressipi_domain', normalizeDressipiDomain(dressipiDomain));
    } else {
      localStorage.removeItem('dressipi_domain');
    }

    if (dressipiTestItemId) {
      localStorage.setItem('dressipi_seed_item_id', dressipiTestItemId.trim());
    } else {
      localStorage.removeItem('dressipi_seed_item_id');
    }
  }, [dressipiDomain, dressipiTestItemId]);

  useEffect(() => {
    if (!isInitialLoad.current) {
      return;
    }

    const loadInitialSettings = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/settings');
        const data = await response.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
          setWebsiteUrl(data.settings.website_url || '');
          if (data.settings.dressipi_domain || data.settings.dressipi_seed_item_id) {
            setDressipiDomain(data.settings.dressipi_domain || '');
            setDressipiTestItemId(data.settings.dressipi_seed_item_id || '');
          }
          if (data.dressipi) {
            setDressipiDomain(data.dressipi.domain || data.settings.dressipi_domain || '');
            setDressipiTestItemId(data.dressipi.seed_item_id || data.settings.dressipi_seed_item_id || '');
          }
          addMessage('assistant', `Settings loaded for ${data.settings.website_url}. Review and edit your brand profile below.`);
        } else {
          if (data.dressipi) {
            setDressipiDomain(data.dressipi.domain || '');
            setDressipiTestItemId(data.dressipi.seed_item_id || '');
          }
          addMessage('assistant', "Hi! Let's set up your brand profile. What's your company website URL?");
        }
        dressipiReadyRef.current = true;
      } catch (error) {
        console.error('Failed to load settings:', error);
        addMessage('assistant', "Hi! Let's set up your brand profile. What's your company website URL?");
        dressipiReadyRef.current = true;
      }
    };

    loadInitialSettings();
    isInitialLoad.current = false;
  }, [addMessage]);

  useEffect(() => {
    return () => {
      if (dressipiSaveTimeout.current) {
        clearTimeout(dressipiSaveTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!dressipiReadyRef.current) return;
    if (!dressipiDomain.trim() || !dressipiTestItemId.trim()) return;

    if (dressipiSaveTimeout.current) {
      clearTimeout(dressipiSaveTimeout.current);
    }

    dressipiSaveTimeout.current = setTimeout(() => {
      persistDressipiSettings(dressipiDomain, dressipiTestItemId);
    }, 800);
  }, [dressipiDomain, dressipiTestItemId, persistDressipiSettings]);

  useEffect(() => {
    if (location.hash === '#dressipi-similar-items') {
      const target = document.getElementById('dressipi-similar-items');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [location.hash, settings]);

  const fetchDressipiRelated = async () => {
    const rawDomain = dressipiDomain.trim();
    const seedItem = dressipiTestItemId.trim();

    if (!rawDomain || !seedItem) {
      setDressipiError('Please enter both a Dressipi domain and an item ID.');
      return;
    }

    setDressipiError('');
    setIsLoadingDressipi(true);

    try {
      const sanitizedDomain = normalizeDressipiDomain(rawDomain);
      const params = new URLSearchParams({
        itemId: seedItem
      });

      if (sanitizedDomain.includes('.')) {
        params.set('domain', sanitizedDomain);
      } else {
        params.set('customerName', sanitizedDomain);
      }

      const requestUrl = `http://localhost:3000/api/dressipi/related?${params.toString()}`;
      setDressipiLastRequest(requestUrl);

      const response = await fetch(requestUrl);
      const rawBody = await response.text();

      let data;
      try {
        data = JSON.parse(rawBody);
      } catch (parseError) {
        throw new Error(
          `Unexpected response from Dressipi proxy (status ${response.status}): ${parseError.message}. Preview: ${rawBody.slice(0, 200)}`
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      setDressipiResults(data.data);
      persistDressipiSettings(rawDomain, seedItem);
      setDressipiError('');
    } catch (error) {
      console.error('Dressipi fetch error:', error);
      setDressipiResults(null);
      setDressipiError(error.message || 'Failed to fetch related items.');
    } finally {
      setIsLoadingDressipi(false);
    }
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

  const saveSettings = async () => {
    try {
      const payload = {
        brandProfile: settings || {},
        dressipi: {
          domain: dressipiDomain ? normalizeDressipiDomain(dressipiDomain) : null,
          seed_item_id: dressipiTestItemId ? dressipiTestItemId.trim() : null,
        }
      };

      const response = await fetch('http://localhost:3000/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
          <div className="lg:col-span-3 space-y-6">
            <SettingsForm
              settings={settings}
              setSettings={setSettings}
              saveSettings={saveSettings}
            />
            <DressipiRelatedItems
              domain={dressipiDomain}
              onDomainChange={(value) => {
                setDressipiDomain(value);
                if (dressipiError) setDressipiError('');
              }}
              itemId={dressipiTestItemId}
              onItemIdChange={(value) => {
            setDressipiTestItemId(value);
            if (dressipiError) setDressipiError('');
          }}
          onFetch={fetchDressipiRelated}
          isLoading={isLoadingDressipi}
          results={dressipiResults}
          error={dressipiError}
          lastRequestUrl={dressipiLastRequest}
        />
      </div>
        </div>
      </main>
    </div>
  );
}

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

const ChatMessage = ({ role, content }) => (
  <div className={`flex items-start gap-3 ${role === 'user' ? 'justify-end' : ''}`}>
    {role === 'assistant' && <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">🤖</div>}
    <div className={`rounded-xl p-4 max-w-[85%] ${role === 'user' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/5 border border-white/10'}`}>
      <p className="text-sm whitespace-pre-line">{content}</p>
    </div>
    {role === 'user' && <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0">👤</div>}
  </div>
);

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

const DressipiRelatedItems = ({
  domain,
  onDomainChange,
  itemId,
  onItemIdChange,
  onFetch,
  isLoading,
  results,
  error,
  lastRequestUrl,
}) => {
  const sanitizedDomain = normalizeDressipiDomain(domain);
  const derivedDomain =
    sanitizedDomain ||
    (results && typeof results === 'object' && (
      results.domain ||
      results.base_domain ||
      results.client_domain ||
      results.client?.domain ||
      results.environment_domain
    )) ||
    '';

  const garmentData = Array.isArray(results?.garment_data) ? results.garment_data : [];

  const recommendedItems = garmentData.map((item) => ({
    ...item,
    thumbnail_image_url:
      item.thumbnail_image_url ||
      item.image_url ||
      (Array.isArray(item.feed_image_urls) ? item.feed_image_urls[0] : null) ||
      null,
  }));

  const seedItemRaw = results?.seed_detail;
  const seedItem = seedItemRaw
    ? {
        ...seedItemRaw,
        thumbnail_image_url:
          seedItemRaw.thumbnail_image_url ||
          seedItemRaw.image_url ||
          (Array.isArray(seedItemRaw.feed_image_urls) ? seedItemRaw.feed_image_urls[0] : null) ||
          null,
      }
    : null;

  const resolveName = (item, index, fallbackPrefix = 'Item') =>
    item?.name ||
    item?.title ||
    item?.display_name ||
    item?.garment_id ||
    item?.product_code ||
    `${fallbackPrefix} ${index + 1}`;

  const resolvePrice = (item) => {
    if (!item) return null;
    if (item.price && typeof item.price === 'object') {
      return item.price.formatted || item.price.current || item.price.display || null;
    }
    return item.price || null;
  };

  const resolveProductUrl = (item) =>
    item?.url ||
    item?.product_url ||
    item?.productUrl ||
    null;

  const showEmptyState = results && recommendedItems.length === 0 && !seedItem && !isLoading && !error;

  const renderGarmentCard = (item, index, options = {}) => {
    const { label, fallbackPrefix = 'Item' } = options;
    if (!item) return null;

    const name = resolveName(item, index, fallbackPrefix);
    const price = resolvePrice(item);
    const productUrl = resolveProductUrl(item);
    const thumbnail = item.thumbnail_image_url || null;
    const displayId = item.garment_id || item.product_code || item.id || item.item_id || null;

    return (
      <div key={displayId || index} className="bg-black/30 border border-white/10 rounded-xl overflow-hidden shadow-lg shadow-black/20 flex flex-col">
        <div className="relative bg-black/40 aspect-[4/5] flex items-center justify-center">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={name}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="text-sm text-gray-500 px-4 text-center">
              Thumbnail not available
            </div>
          )}
        </div>
        <div className="p-4 space-y-2 flex-1 flex flex-col">
          <div>
            {label && <p className="text-xs uppercase tracking-wide text-purple-300 mb-1">{label}</p>}
            <p className="text-sm font-semibold text-white line-clamp-2">{name}</p>
            {displayId && <p className="text-xs text-gray-400 mt-1">ID: {displayId}</p>}
          </div>
          {price && (
            <p className="text-sm text-purple-300 font-medium mt-auto">
              {price}
            </p>
          )}
          {productUrl && (
            <a
              href={productUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-purple-300 hover:text-purple-200 transition-colors inline-flex items-center gap-1"
            >
              View product ↗
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div id="dressipi-similar-items" className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10 bg-black/20 flex items-center justify-between">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <span className="text-purple-400">🧥</span> Dressipi Related Items
        </h2>
        <button
          onClick={onFetch}
          disabled={isLoading}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Testing…' : 'Test API'}
        </button>
      </div>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Dressipi Domain</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => onDomainChange(e.target.value)}
              placeholder="e.g. dressipi.anntaylor.com"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-sm placeholder:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Test Item ID</label>
            <input
              type="text"
              value={itemId}
              onChange={(e) => onItemIdChange(e.target.value)}
              placeholder="e.g. 851291_020142"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-sm placeholder:text-gray-500"
            />
          </div>
        </div>
        {lastRequestUrl && (
          <div className="px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-xs text-gray-400 break-all">
            <span className="text-gray-500">Last request:</span>{' '}
            <code className="text-purple-200">{lastRequestUrl}</code>
          </div>
        )}

        {error && (
          <div className="px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-400/40 text-sm text-rose-200">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <span className="text-purple-400 animate-spin">⏳</span> Fetching related items from Dressipi…
          </div>
        )}

        {(seedItem || recommendedItems.length > 0) && (
          <div className="space-y-4">
            <div className="text-sm text-gray-400">
              Showing related items for <span className="text-white font-medium">{itemId || 'your item'}</span> on{' '}
              <span className="text-white font-medium">
                {derivedDomain || 'configured domain'}
              </span>
            </div>

            {seedItem && (
              <div>
                <h3 className="text-sm font-semibold text-purple-300 mb-3">Seed Item</h3>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                  {renderGarmentCard(seedItem, 0, { label: 'Seed Item', fallbackPrefix: 'Seed Item' })}
                </div>
                {results?.seed_detail_error && (
                  <p className="text-xs text-rose-300 mt-2">
                    Unable to load full seed details: {results.seed_detail_error}
                  </p>
                )}
              </div>
            )}

            {recommendedItems.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-purple-300 mb-3">Recommended Items</h3>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                  {recommendedItems.map((item, index) =>
                    renderGarmentCard(item, index, { fallbackPrefix: 'Recommendation' })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {showEmptyState && (
          <div className="px-4 py-6 bg-black/40 border border-dashed border-white/10 rounded-xl text-center text-sm text-gray-400">
            No related items were returned for this item. Try a different item ID or confirm the customer name.
          </div>
        )}

        {results && (
          <details className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
            <summary className="px-4 py-3 cursor-pointer text-sm text-gray-400 select-none hover:text-white">Raw response</summary>
            <pre className="bg-black/70 text-xs text-gray-300 p-4 overflow-x-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

const SettingsForm = ({ settings, setSettings, saveSettings }) => {
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
        {settings && <button onClick={saveSettings} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg text-sm font-medium transition-all">💾 Save Changes</button>}
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
            <TextAreaField
              label="Full Scan Data (Markdown)"
              value={settings.full_scan_markdown || ''}
              onChange={(value) => setSettings(prev => ({ ...prev, full_scan_markdown: value }))}
              rows={25}
            />
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
