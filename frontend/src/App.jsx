import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import InteractiveEmailPreview from './components/InteractiveEmailPreview';
import ClarificationDialog from './components/ClarificationDialog';

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
  const [viewMode, setViewMode] = useState('preview'); // 'preview' or 'code'
  const [showMappHelper, setShowMappHelper] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [emailImages, setEmailImages] = useState([]); // Images included in the email
  const [showClarificationDialog, setShowClarificationDialog] = useState(false);
  const [clarifyingQuestions, setClarifyingQuestions] = useState([]);
  const [pendingBrief, setPendingBrief] = useState(null);
  const [generationStage, setGenerationStage] = useState(''); // Progress indicator
  const [previewMode, setPreviewMode] = useState('desktop');

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
    setGenerationStage('🎨 Creative Director analyzing your request...');

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

      // Handle requiresSettings
      if (data.requiresSettings) {
        setIsGenerating(false);
        setGenerationStage('');
        const settingsMessage = {
          role: 'assistant',
          content: data.message + '\n\n[Click Settings in the header to configure your profile]'
        };
        setMessages(prev => [...prev, settingsMessage]);
        setInputValue('');
        return;
      }

      // Handle needsClarification
      if (data.needsClarification) {
        setIsGenerating(false);
        setGenerationStage('');
        setClarifyingQuestions(data.questions);
        setPendingBrief(data.brief);
        setShowClarificationDialog(true);
        setInputValue('');
        return;
      }

      if (data.success) {
        setGenerationStage('✅ Campaign complete!');

        // Add AI response to chat
        const imageCount = data.images?.length || 0;
        const aiMessage = {
          role: 'assistant',
          content: `I've created your professional email campaign: "${data.content.subject}"${imageCount > 0 ? ` with ${imageCount} custom AI-generated image${imageCount > 1 ? 's' : ''}` : ''}`
        };
        setMessages(prev => [...prev, aiMessage]);

        // Update email preview and content
        setEmailHtml(data.html);
        setEmailContent(data.content);
        setEmailImages(data.images || []);
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
      setGenerationStage('');
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

  const handleGenerateImage = async (imagePrompt) => {
    setIsGeneratingImage(true);

    // Add message about generating image
    const generatingMessage = {
      role: 'assistant',
      content: `Generating image: "${imagePrompt}"`
    };
    setMessages(prev => [...prev, generatingMessage]);

    try {
      const response = await fetch('http://localhost:3000/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          quality: 'hd',
          style: 'vivid'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedImages(prev => [...prev, data]);

        const successMessage = {
          role: 'assistant',
          content: `Image generated successfully!`,
          image: data.imageUrl
        };
        setMessages(prev => [...prev, successMessage]);
      } else {
        const errorMessage = {
          role: 'assistant',
          content: `Error generating image: ${data.error}`
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
      setIsGeneratingImage(false);
    }
  };

  const handleRegenerateImage = async (imageUrl) => {
    setIsGeneratingImage(true);

    try {
      const prompt = window.prompt('Enter new image description (or leave empty to regenerate with original prompt):');
      if (prompt === null) {
        setIsGeneratingImage(false);
        return;
      }

      // Find original image to get its prompt
      const originalImage = emailImages.find(img => img.url === imageUrl);
      const imagePrompt = prompt || originalImage?.prompt || 'Professional email marketing image';

      const response = await fetch('http://localhost:3000/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          quality: 'hd',
          style: 'vivid'
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Replace the image in the HTML
        const newHtml = emailHtml.replace(imageUrl, data.imageUrl);
        setEmailHtml(newHtml);

        // Update emailImages array
        setEmailImages(prev => prev.map(img =>
          img.url === imageUrl
            ? { url: data.imageUrl, prompt: imagePrompt, revisedPrompt: data.revisedPrompt }
            : img
        ));

        const successMessage = {
          role: 'assistant',
          content: `Image regenerated successfully!`
        };
        setMessages(prev => [...prev, successMessage]);
      }
    } catch (error) {
      console.error('Image regeneration error:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleAnswersSubmit = async (answers) => {
    try {
      setShowClarificationDialog(false);
      setIsGenerating(true);
      setGenerationStage('🔄 Refining campaign with your answers...');

      const response = await fetch('http://localhost:3000/api/generate-email-with-answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brief: pendingBrief,
          answers: answers,
          lookAndFeel: {
            brandColor: '#6366f1',
            accentColor: '#ec4899',
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGenerationStage('✅ Campaign complete!');

        // Add AI response to chat
        const imageCount = data.images?.length || 0;
        const aiMessage = {
          role: 'assistant',
          content: `I've refined your campaign based on your answers: "${data.content.subject}"${imageCount > 0 ? ` with ${imageCount} custom AI-generated image${imageCount > 1 ? 's' : ''}` : ''}`
        };
        setMessages(prev => [...prev, aiMessage]);

        // Update email preview and content
        setEmailHtml(data.html);
        setEmailContent(data.content);
        setEmailImages(data.images || []);
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
      setGenerationStage('');
      setPendingBrief(null);
      setClarifyingQuestions([]);
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
            <Link to="/settings" className="text-sm text-gray-300 hover:text-white transition-colors">
              ⚙️ Settings
            </Link>
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
                    {message.image && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-white/20">
                        <img
                          src={message.image}
                          alt="Generated"
                          className="w-full h-auto"
                        />
                        <div className="p-2 bg-black/20 flex gap-2">
                          <button
                            onClick={() => navigator.clipboard.writeText(message.image)}
                            className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                          >
                            📋 Copy URL
                          </button>
                          <a
                            href={message.image}
                            download
                            className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                          >
                            💾 Download
                          </a>
                        </div>
                      </div>
                    )}
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
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      {generationStage && (
                        <p className="text-sm text-gray-300">{generationStage}</p>
                      )}
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
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const prompt = window.prompt('Enter image description:');
                      if (prompt) handleGenerateImage(prompt);
                    }}
                    disabled={isGeneratingImage}
                    className="text-sm text-gray-400 hover:text-purple-400 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <span>🎨</span> Generate Image
                  </button>
                </div>
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
                <span className="text-purple-400">{viewMode === 'preview' ? '👁' : '💻'}</span>
                {viewMode === 'preview' ? 'Interactive Preview' : 'Mapp Template Code'}
              </h2>
              <div className="flex items-center gap-2">
                {emailHtml && (
                  <>
                    <button
                      onClick={() => setShowMappHelper(!showMappHelper)}
                      className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                        showMappHelper
                          ? 'bg-purple-500 border-purple-400'
                          : 'bg-white/5 hover:bg-white/10 border-white/10'
                      }`}
                    >
                      📝 Mapp Helper
                    </button>
                    <button
                      onClick={() => setShowSaveModal(true)}
                      className="text-xs px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-medium transition-colors"
                    >
                      💾 Save
                    </button>
                  </>
                )}
                {viewMode === 'preview' && (
                  <>
                    <button
                      onClick={() => setPreviewMode('desktop')}
                      aria-pressed={previewMode === 'desktop'}
                      className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                        previewMode === 'desktop'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-transparent shadow-lg shadow-purple-500/30'
                          : 'bg-white/5 hover:bg-white/10 border-white/10'
                      }`}
                    >
                      💻 Desktop
                    </button>
                    <button
                      onClick={() => setPreviewMode('mobile')}
                      aria-pressed={previewMode === 'mobile'}
                      className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                        previewMode === 'mobile'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-transparent shadow-lg shadow-purple-500/30'
                          : 'bg-white/5 hover:bg-white/10 border-white/10'
                      }`}
                    >
                      📱 Mobile
                    </button>
                  </>
                )}
                <div className="flex border border-white/10 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`text-xs px-3 py-1 transition-colors ${
                      viewMode === 'preview' ? 'bg-white/10' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    👁 Preview
                  </button>
                  <button
                    onClick={() => setViewMode('code')}
                    className={`text-xs px-3 py-1 border-l border-white/10 transition-colors ${
                      viewMode === 'code' ? 'bg-white/10' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    &lt;/&gt; Code
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
              {viewMode === 'code' ? (
                emailHtml ? (
                  <div className="bg-slate-900 rounded-lg border border-white/10 overflow-hidden h-full">
                    <div className="px-4 py-2 bg-black/40 border-b border-white/10 flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-mono">HTML + Mapp Template</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(emailHtml)}
                        className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 rounded transition-colors"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <pre className="p-4 text-xs text-gray-300 font-mono overflow-auto h-[calc(100%-40px)]">
                      <code>{emailHtml}</code>
                    </pre>
                  </div>
                ) : (
                  <div className="bg-slate-900/60 border border-white/5 rounded-lg h-full flex items-center justify-center">
                    <p className="text-sm text-gray-400">Generate an email to view the template code.</p>
                  </div>
                )
              ) : (
                <div
                  className={`transition-all duration-300 ${
                    previewMode === 'mobile' ? 'flex justify-center py-6' : 'mx-auto'
                  }`}
                >
                  <div
                    className={`transition-all duration-300 ${
                      previewMode === 'mobile'
                        ? 'w-[380px] max-w-full'
                        : 'max-w-2xl w-full'
                    }`}
                  >
                    <div
                      className={`transition-all duration-300 ${
                        previewMode === 'mobile'
                          ? 'bg-slate-900 rounded-[32px] p-4 shadow-2xl border border-slate-800 min-h-full flex items-center justify-center'
                          : 'bg-white rounded-lg shadow-2xl border border-white/10 min-h-full'
                      }`}
                    >
                      <div
                        className={`overflow-hidden ${
                          previewMode === 'mobile'
                            ? 'rounded-[22px] bg-white'
                            : 'rounded-lg bg-white'
                        }`}
                      >
                        <InteractiveEmailPreview
                          html={emailHtml || null}
                          onRegenerateImage={handleRegenerateImage}
                          isGeneratingImage={isGeneratingImage}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
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

      {/* Mapp Helper Panel */}
      {showMappHelper && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-end z-50" onClick={() => setShowMappHelper(false)}>
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 border-l border-white/10 h-full w-full max-w-lg overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span>📝</span> Mapp Engage Syntax
              </h3>
              <button
                onClick={() => setShowMappHelper(false)}
                className="w-8 h-8 hover:bg-white/10 rounded-lg flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* User Fields */}
              <div>
                <h4 className="font-semibold text-purple-400 mb-3">User Fields</h4>
                <div className="space-y-2 font-mono text-xs">
                  <div className="bg-white/5 border border-white/10 rounded p-2">
                    <code className="text-green-400">&lt;%${`{user['FirstName']}`}%&gt;</code>
                    <span className="text-gray-400 ml-2">- First Name</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-2">
                    <code className="text-green-400">&lt;%${`{user['LastName']}`}%&gt;</code>
                    <span className="text-gray-400 ml-2">- Last Name</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-2">
                    <code className="text-green-400">&lt;%${`{user['Email']}`}%&gt;</code>
                    <span className="text-gray-400 ml-2">- Email Address</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-2">
                    <code className="text-green-400">&lt;%${`{user['Title']}`}%&gt;</code>
                    <span className="text-gray-400 ml-2">- Title (Mr., Ms., etc.)</span>
                  </div>
                </div>
              </div>

              {/* Custom Fields */}
              <div>
                <h4 className="font-semibold text-purple-400 mb-3">Custom Attributes</h4>
                <div className="space-y-2 font-mono text-xs">
                  <div className="bg-white/5 border border-white/10 rounded p-2">
                    <code className="text-yellow-400">&lt;%${`{user.CustomAttribute['fieldname']}`}%&gt;</code>
                    <span className="text-gray-400 ml-2">- Custom Field</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-2">
                    <code className="text-yellow-400">&lt;%${`{user.MemberAttribute['LastPurchase']}`}%&gt;</code>
                    <span className="text-gray-400 ml-2">- Member Attribute</span>
                  </div>
                </div>
              </div>

              {/* System Links */}
              <div>
                <h4 className="font-semibold text-purple-400 mb-3">System Links</h4>
                <div className="space-y-2 font-mono text-xs">
                  <div className="bg-white/5 border border-white/10 rounded p-2">
                    <code className="text-blue-400">&lt;%Unsubscribe%&gt;</code>
                    <span className="text-gray-400 ml-2">- Unsubscribe Link</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-2">
                    <code className="text-blue-400">&lt;%ReadMessageOnline%&gt;</code>
                    <span className="text-gray-400 ml-2">- View Online Link</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-2">
                    <code className="text-blue-400">&lt;%ProfileEdit%&gt;</code>
                    <span className="text-gray-400 ml-2">- Profile Edit Link</span>
                  </div>
                </div>
              </div>

              {/* Conditional Logic */}
              <div>
                <h4 className="font-semibold text-purple-400 mb-3">Conditional Content</h4>
                <div className="bg-white/5 border border-white/10 rounded p-3 font-mono text-xs">
                  <pre className="text-pink-400 whitespace-pre-wrap">{`<%If expression="\${user['FirstName'] != null}"%>
  Hello <%\${user['FirstName']}%>!
<%Else%>
  Hello valued customer!
<%/If%>`}</pre>
                </div>
              </div>

              {/* Product Loops */}
              <div>
                <h4 className="font-semibold text-purple-400 mb-3">Product Recommendations</h4>
                <div className="bg-white/5 border border-white/10 rounded p-3 font-mono text-xs">
                  <pre className="text-orange-400 whitespace-pre-wrap">{`<%ForEach var="product" items="\${ecx:recommendedProducts('PRECALC', user.pk, '3', 500)}"%>
  <div>
    <h3><%\${product.productName}%></h3>
    <p>$<%\${product.productPrice}%></p>
  </div>
<%/ForEach%>`}</pre>
                </div>
              </div>

              {/* Functions */}
              <div>
                <h4 className="font-semibold text-purple-400 mb-3">Common Functions</h4>
                <div className="space-y-2 font-mono text-xs">
                  <div className="bg-white/5 border border-white/10 rounded p-2">
                    <code className="text-cyan-400">&lt;%${`{ecx:capitalizeFirstLetter(user['FirstName'])}`}%&gt;</code>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-2">
                    <code className="text-cyan-400">&lt;%${`{ecx:formatDate(date, 'MMMM d, yyyy')}`}%&gt;</code>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-2">
                    <code className="text-cyan-400">&lt;%${`{ecx:formatNumber(price, 2, '.', ',')}`}%&gt;</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clarification Dialog */}
      {showClarificationDialog && (
        <ClarificationDialog
          questions={clarifyingQuestions}
          onSubmit={handleAnswersSubmit}
          onCancel={() => {
            setShowClarificationDialog(false);
            setPendingBrief(null);
            setClarifyingQuestions([]);
            const cancelMessage = {
              role: 'assistant',
              content: 'No problem! Feel free to provide a more detailed request when you\'re ready.'
            };
            setMessages(prev => [...prev, cancelMessage]);
          }}
        />
      )}
    </div>
  );
}

export default App;
