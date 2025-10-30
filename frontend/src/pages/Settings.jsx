import { useState, useEffect, useRef } from 'react';

function Settings() {
  const [settings, setSettings] = useState(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [messages, setMessages] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    corporate: true,
    tone: false,
    contact: false,
    email: false,
    content: false,
    compliance: false
  });
  const isInitialLoad = useRef(true);

  // Load existing settings on mount
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

        if (data.settings.website_url) {
          addMessage('assistant', `Settings loaded for ${data.settings.website_url}. What would you like to know or change?`);
        } else {
          addMessage('assistant', "Hi! Let's set up your brand profile. What's your company website URL?");
        }
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

    // Normalize URL
    let url = websiteUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    addMessage('user', url);
    addMessage('assistant', '🔄 Scanning website... This may take 30-60 seconds.');
    setIsScanning(true);

    try {
      const response = await fetch('http://localhost:3000/api/settings/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (data.success) {
        // The data from the API is already parsed, so we can use it directly.
        const newSettings = {
          ...data.data,
          // Ensure these exist to prevent rendering errors
          content_guidelines: data.data.content_guidelines || {},
        };
        setSettings(newSettings);

        addMessage('assistant', `✅ Scan complete! Found:\n• Company: ${newSettings.corporate_identity?.companyName}\n• Logo: ${newSettings.corporate_identity?.logoUrl ? '✓' : '✗'}\n• Colors: ${newSettings.corporate_identity?.brandColors?.primary || 'Not found'}\n• Tone: ${newSettings.tone_of_voice?.style || 'Not found'}\n\nReview the settings on the right and make any adjustments →`);

        // Expand all sections to show populated data
        setExpandedSections({
          corporate: true,
          tone: true,
          contact: true,
          email: true,
          content: true,
          mapp: false,
          compliance: false
        });
      } else {
        addMessage('assistant', `❌ Scan failed: ${data.error}\n\nPlease check the URL and try again.`);
      }
    } catch (error) {
      addMessage('assistant', `❌ Error: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateSetting = (category, field, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const saveSettings = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white font-sans">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-600 rounded-lg flex items-center justify-center text-2xl">
                ✉
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  LLM-Mail
                </h1>
                <p className="text-xs text-gray-400">Settings</p>
              </div>
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm text-gray-300 hover:text-white transition-colors">
              ← Back to Editor
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-140px)]">

          {/* Left Side: Chat (2/5 width) */}
          <div className="lg:col-span-2 flex flex-col bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 bg-black/20">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <span className="text-purple-400">💬</span>
                Setup Assistant
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${
                    message.role === 'user' ? 'justify-end' : ''
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                      🤖
                    </div>
                  )}
                  <div
                    className={`rounded-xl p-4 max-w-[85%] ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0">
                      👤
                    </div>
                  )}
                </div>
              ))}

              {isScanning && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                    🤖
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* URL Input */}
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
                  className="flex-1 px-4 py-2 bg-white/5 text-white border border-white/10 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-gray-500 disabled:opacity-50"
                />
                <button
                  onClick={handleScanWebsite}
                  disabled={isScanning}
                  className="px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl font-medium shadow-lg shadow-purple-500/50 transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isScanning ? '⏳' : '🔍'} Scan
                </button>
              </div>
            </div>
          </div>

          {/* Right Side: Settings Form (3/5 width) */}
          <div className="lg:col-span-3 flex flex-col bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 bg-black/20 flex items-center justify-between">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <span className="text-purple-400">⚙️</span>
                Brand Settings
              </h2>
              {settings && (
                <button
                  onClick={saveSettings}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg text-sm font-medium transition-all"
                >
                  💾 Save Changes
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {!settings ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-3">🌐</p>
                  <p className="text-sm">Enter your website URL to get started</p>
                  <p className="text-xs mt-2">I'll scan your site and populate all settings</p>
                </div>
              ) : (
                <>
                  {/* Corporate Identity Section */}
                  <SettingsSection
                    title="Corporate Identity"
                    icon="🎨"
                    expanded={expandedSections.corporate}
                    onToggle={() => toggleSection('corporate')}
                    filled={!!settings.corporate_identity}
                  >
                    {settings.corporate_identity && (
                      <div className="space-y-3">
                        <InputField
                          label="Company Name"
                          value={settings.corporate_identity.companyName || ''}
                          onChange={(v) => updateSetting('corporate_identity', 'companyName', v)}
                        />
                        <InputField
                          label="Logo URL"
                          value={settings.corporate_identity.logoUrl || ''}
                          onChange={(v) => updateSetting('corporate_identity', 'logoUrl', v)}
                        />
                        {settings.corporate_identity.logoUrl && (
                          <div className="h-12 mt-2">
                            <img
                              src={`http://localhost:3000/api/image-proxy?url=${encodeURIComponent(settings.corporate_identity.logoUrl)}`}
                              alt="Company Logo"
                              className="h-full w-auto object-contain"
                              onError={(e) => {
                                e.target.onerror = null; // Prevent infinite loop
                                e.target.alt = "Logo could not be loaded";
                                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='40' viewBox='0 0 100 40'%3E%3Crect width='100' height='40' fill='%23eee'/%3E%3Ctext x='50' y='25' font-family='Arial' font-size='10' fill='%23999' text-anchor='middle'%3ELogo Failed%3C/text%3E%3C/svg%3E";
                              }}
                            />
                          </div>
                        )}
                        <InputField
                          label="Tagline"
                          value={settings.corporate_identity.tagline || ''}
                          onChange={(v) => updateSetting('corporate_identity', 'tagline', v)}
                        />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {(() => {
                            const colors = settings.corporate_identity.brandColors;
                            const colorArray = Array.isArray(colors) 
                              ? colors 
                              : (colors && typeof colors === 'object' ? Object.values(colors) : []);
                              
                            return colorArray.map((color, index) => (
                              <ColorInput
                                key={index}
                                label={`Color ${index + 1}`}
                                value={color || ''}
                                onChange={(newColor) => {
                                  const newColors = [...colorArray];
                                  newColors[index] = newColor;
                                  updateSetting('corporate_identity', 'brandColors', newColors);
                                }}
                              />
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </SettingsSection>

                  {/* Tone of Voice Section */}
                  <SettingsSection
                    title="Tone of Voice"
                    icon="🗣️"
                    expanded={expandedSections.tone}
                    onToggle={() => toggleSection('tone')}
                    filled={!!settings.tone_of_voice}
                  >
                    {settings.tone_of_voice && (
                      <div className="space-y-3">
                        <TextAreaField
                          label="Style & Voice Description"
                          value={settings.tone_of_voice.style || ''}
                          onChange={(v) => updateSetting('tone_of_voice', 'style', v)}
                          rows={5}
                          placeholder="e.g., Friendly and inspiring, uses 'you' to address the customer directly. Sentences are short and clear. Aims to make the reader feel empowered."
                        />
                        <TextAreaField
                          label="Image Style Description"
                          value={settings.tone_of_voice.imageStyle || ''}
                          onChange={(v) => updateSetting('tone_of_voice', 'imageStyle', v)}
                          rows={4}
                          placeholder="e.g., Bright and airy, with natural light. Features diverse models in real-world scenarios. Products are shown in context."
                        />
                      </div>
                    )}
                  </SettingsSection>

                  {/* Contact Info Section */}
                  <SettingsSection
                    title="Contact Information"
                    icon="📞"
                    expanded={expandedSections.contact}
                    onToggle={() => toggleSection('contact')}
                    filled={!!settings.contact_info}
                  >
                    {settings.contact_info && (
                      <div className="space-y-3">
                        <InputField
                          label="Email"
                          value={settings.contact_info.email || ''}
                          onChange={(v) => updateSetting('contact_info', 'email', v)}
                        />
                        <InputField
                          label="Phone"
                          value={settings.contact_info.phone || ''}
                          onChange={(v) => updateSetting('contact_info', 'phone', v)}
                        />
                        <TextAreaField
                          label="Address"
                          value={settings.contact_info.address || ''}
                          onChange={(v) => updateSetting('contact_info', 'address', v)}
                          rows={2}
                        />
                      </div>
                    )}
                  </SettingsSection>

                  {/* Email Configuration Section */}
                  <SettingsSection
                    title="Email Configuration"
                    icon="📧"
                    expanded={expandedSections.email}
                    onToggle={() => toggleSection('email')}
                    filled={!!settings.email_config}
                  >
                    {settings.email_config && (
                      <div className="space-y-3">
                        <InputField
                          label="Default Sender Name"
                          value={settings.email_config.senderName || ''}
                          onChange={(v) => updateSetting('email_config', 'senderName', v)}
                        />
                        <InputField
                          label="Default Sender Email"
                          value={settings.email_config.senderEmail || ''}
                          onChange={(v) => updateSetting('email_config', 'senderEmail', v)}
                        />
                        <InputField
                          label="Default Reply-To Email"
                          value={settings.email_config.replyToEmail || ''}
                          onChange={(v) => updateSetting('email_config', 'replyToEmail', v)}
                        />
                        <InputField
                          label="Unsubscribe Link Text"
                          value={settings.email_config.unsubscribeText || ''}
                          onChange={(v) => updateSetting('email_config', 'unsubscribeText', v)}
                        />
                      </div>
                    )}
                  </SettingsSection>

                                    {/* Content Guidelines Section */}

                                    <SettingsSection

                                      title="Content Guidelines"

                                      icon="📝"

                                      expanded={expandedSections.content}

                                      onToggle={() => toggleSection('content')}

                                      filled={!!settings.content_guidelines}

                                    >

                                      {settings.content_guidelines && (

                                        <div className="space-y-3">

                                          <TextAreaField

                                            label="✅ Do"

                                            value={settings.content_guidelines.do || ''}

                                            onChange={(v) => updateSetting('content_guidelines', 'do', v)}

                                            rows={4}

                                            placeholder="e.g., Use a friendly and encouraging tone. Keep paragraphs short. Use emojis."

                                          />

                                          <TextAreaField

                                            label="❌ Don't"

                                            value={settings.content_guidelines.dont || ''}

                                            onChange={(v) => updateSetting('content_guidelines', 'dont', v)}

                                            rows={4}

                                            placeholder="e.g., Use technical jargon. Make promises we can't keep. Be overly formal."

                                          />

                                        </div>

                                      )}

                                    </SettingsSection>

                  

                                    {/* Compliance Section */}

                                    <SettingsSection

                                      title="Compliance & Legal"

                                      icon="⚖️"

                                      expanded={expandedSections.compliance}

                                      onToggle={() => toggleSection('compliance')}

                                      filled={!!settings.compliance}

                                    >

                                      {settings.compliance && (

                                        <div className="space-y-3">

                                          <InputField

                                            label="Privacy Policy URL"

                                            value={settings.compliance.privacyPolicyUrl || ''}

                                            onChange={(v) => updateSetting('compliance', 'privacyPolicyUrl', v)}

                                          />

                                          <TextAreaField

                                            label="Terms & Conditions"

                                            value={settings.compliance.termsAndConditions || ''}

                                            onChange={(v) => updateSetting('compliance', 'termsAndConditions', v)}

                                            rows={5}

                                          />

                                        </div>

                                      )}

                                    </SettingsSection>

                                  </>

                                )}

                              </div>

                            </div>

                  

        </div>
      </div>
    </div>
  );
}

// Helper Components
function SettingsSection({ title, icon, expanded, onToggle, filled, children }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <span>{icon}</span>
          {title}
          {filled && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">✓ Filled</span>}
        </span>
        <span className="text-gray-400">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <div className="px-4 py-3 border-t border-white/10">
          {children}
        </div>
      )}
    </div>
  );
}

function InputField({ label, value, onChange, placeholder = '' }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-white/5 text-white border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all text-sm"
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder = '', rows = 3 }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 bg-white/5 text-white border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all text-sm resize-none"
      />
    </div>
  );
}

function ColorInput({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded-lg border border-white/10 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-white/5 text-white border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-sm"
        />
      </div>
    </div>
  );
}

export default Settings;
