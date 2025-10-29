import { useState, useEffect } from 'react';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [emailHtml, setEmailHtml] = useState('');
  const [emailContent, setEmailContent] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleGenerate = async () => {
    if (!inputValue.trim()) return;

    // Add user message to chat
    const userMessage = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setCurrentPrompt(inputValue);

    setIsGenerating(true);

    try {
      const response = await fetch('http://localhost:3000/api/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: inputValue,
          lookAndFeel: {
            brandColor: '#6366f1',
            accentColor: '#ec4899',
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Add AI response to chat
        const aiMessage = {
          role: 'assistant',
          content: `I've created your email template: "${data.content.subject}"`
        };
        setMessages(prev => [...prev, aiMessage]);

        // Update email preview and content
        setEmailHtml(data.html);
        setEmailContent(data.content);
      } else {
        const errorMessage = {
          role: 'assistant',
          content: `Error: ${data.error}`
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.message}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
      setInputValue('');
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !emailHtml) {
      alert('Please provide a template name');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          subject: emailContent?.subject || '',
          preheader: emailContent?.preheader || '',
          html: emailHtml,
          userPrompt: currentPrompt,
          lookAndFeel: {
            brandColor: '#6366f1',
            accentColor: '#ec4899',
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Template saved successfully!');
        setShowSaveModal(false);
        setTemplateName('');
        setTemplateDescription('');
        loadTemplates();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Failed to save template: ${error.message}`);
    }
  };

  const loadTemplate = async (templateId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/templates/${templateId}`);
      const data = await response.json();

      if (data.success) {
        setEmailHtml(data.template.html_content);
        setEmailContent({
          subject: data.template.subject,
          preheader: data.template.preheader
        });

        const aiMessage = {
          role: 'assistant',
          content: `Loaded template: "${data.template.name}"`
        };
        setMessages(prev => [...prev, aiMessage]);
        setShowTemplates(false);
      }
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white font-sans">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-600 rounded-lg flex items-center justify-center text-2xl">
              ✉
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                LLM-Mail
              </h1>
              <p className="text-xs text-gray-400">AI Email Campaign Editor</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              💾 Templates {templates.length > 0 && `(${templates.length})`}
            </button>
            <button className="text-sm text-gray-300 hover:text-white transition-colors">
              ⚙️ Settings
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-140px)]">

          {/* Left Side: Chat Interface */}
          <div className="flex flex-col bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 bg-black/20">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <span className="text-purple-400">💬</span>
                Conversation
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Welcome Message */}
              {messages.length === 0 && (
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                      🤖
                    </div>
                    <div>
                      <p className="font-medium text-purple-300 mb-2">Welcome to LLM-Mail!</p>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        I'll help you create professional email campaigns. Just describe what you need,
                        and I'll generate the content, design, and HTML for you.
                      </p>
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-gray-400">Try saying:</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs bg-white/5 px-3 py-1 rounded-full border border-white/10">
                            "Create a summer sale email"
                          </span>
                          <span className="text-xs bg-white/5 px-3 py-1 rounded-full border border-white/10">
                            "Halloween promo with 20% off"
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Messages */}
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
                    className={`rounded-xl p-4 max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0">
                      👤
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isGenerating && (
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

            {/* Input Area */}
            <div className="p-6 border-t border-white/10 bg-black/20">
              <div className="relative">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Describe the email campaign you want to create..."
                  className="w-full px-4 py-3 pr-12 bg-white/5 text-white border border-white/10 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none h-24 placeholder:text-gray-500"
                  disabled={isGenerating}
                />
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !inputValue.trim()}
                  className="absolute bottom-3 right-3 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg flex items-center justify-center transition-all shadow-lg shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-lg">▲</span>
                </button>
              </div>
              <div className="flex justify-between items-center mt-3">
                <button className="text-sm text-gray-400 hover:text-purple-400 transition-colors flex items-center gap-2">
                  <span>📎</span> Upload Image or URL
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !inputValue.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-medium shadow-lg shadow-purple-500/50 transform hover:scale-105 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? '⏳ Generating...' : '✨ Generate Email'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Side: Preview */}
          <div className="flex flex-col bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 bg-black/20 flex items-center justify-between">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <span className="text-purple-400">👁</span>
                Email Preview
              </h2>
              <div className="flex items-center gap-2">
                {emailHtml && (
                  <button
                    onClick={() => setShowSaveModal(true)}
                    className="text-xs px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-medium transition-colors"
                  >
                    💾 Save Template
                  </button>
                )}
                <button className="text-xs px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors">
                  💻 Desktop
                </button>
                <button className="text-xs px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors">
                  📱 Mobile
                </button>
                <button className="text-xs px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors">
                  &lt;/&gt; Code
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
              {/* Preview Container */}
              <div className="max-w-xl mx-auto bg-white rounded-lg shadow-2xl min-h-full">
                {emailHtml ? (
                  <iframe
                    srcDoc={emailHtml}
                    className="w-full h-full min-h-[600px] rounded-lg"
                    title="Email Preview"
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div className="p-8 text-center text-gray-400">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center text-4xl">
                      📧
                    </div>
                    <p className="font-semibold text-gray-600 mb-2">No Email Generated Yet</p>
                    <p className="text-sm text-gray-500">
                      Start a conversation to create your email campaign
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Save Template Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Save Email Template</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Template Name *</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Summer Sale 2024"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Description (optional)</label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Brief description of this template..."
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none h-20"
                />
              </div>
              <div className="text-sm text-gray-400">
                <p><strong>Subject:</strong> {emailContent?.subject}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setTemplateName('');
                  setTemplateDescription('');
                }}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-medium transition-all"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Sidebar */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-end z-50" onClick={() => setShowTemplates(false)}>
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 border-l border-white/10 h-full w-full max-w-md overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold">Saved Templates</h3>
              <button
                onClick={() => setShowTemplates(false)}
                className="w-8 h-8 hover:bg-white/10 rounded-lg flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {templates.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <p className="text-4xl mb-3">📭</p>
                  <p className="text-sm">No templates saved yet</p>
                  <p className="text-xs mt-2">Generate an email and save it as a template</p>
                </div>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 cursor-pointer transition-all"
                    onClick={() => loadTemplate(template.id)}
                  >
                    <h4 className="font-semibold mb-1">{template.name}</h4>
                    {template.description && (
                      <p className="text-xs text-gray-400 mb-2">{template.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mb-2">
                      <strong>Subject:</strong> {template.subject}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(template.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
