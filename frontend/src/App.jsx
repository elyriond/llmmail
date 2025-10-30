import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import InteractiveEmailPreview from './components/InteractiveEmailPreview';
import ClarificationDialog from './components/ClarificationDialog';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [emailHtml, setEmailHtmlState] = useState('');
  const [emailContent, setEmailContent] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [showNewEmailModal, setShowNewEmailModal] = useState(false);
  const [previewResetKey, setPreviewResetKey] = useState(0);
  const [showMappHelper, setShowMappHelper] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [emailImages, setEmailImages] = useState([]); // Images included in the email
  const [showClarificationDialog, setShowClarificationDialog] = useState(false);
  const [clarifyingQuestions, setClarifyingQuestions] = useState([]);
  const [pendingBrief, setPendingBrief] = useState(null);
  const [generationStage, setGenerationStage] = useState(''); // Progress indicator
  const [previewMode, setPreviewMode] = useState('desktop');
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [showHtmlEditor, setShowHtmlEditor] = useState(false);
  const [htmlEditorLayout, setHtmlEditorLayout] = useState('split'); // 'split' | 'full'

  // Progressive results display
  const [campaignBrief, setCampaignBrief] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [brandColors, setBrandColors] = useState(null);
  const [dressipiDomain, setDressipiDomain] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('dressipi_domain') || '';
  });
  const [dressipiSeedItemId, setDressipiSeedItemId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('dressipi_seed_item_id') || '';
  });
  const [dressipiData, setDressipiData] = useState(null);
  const [dressipiSectionHtml, setDressipiSectionHtml] = useState('');

  const getDressipiImage = (item) =>
    item?.thumbnail_image_url ||
    item?.image_url ||
    (Array.isArray(item?.feed_image_urls) ? item.feed_image_urls[0] : null) ||
    '';

  const getDressipiPrice = (item) => {
    if (!item) return '';
    if (typeof item.price === 'string') return item.price;
    if (typeof item.price === 'number') return `$${item.price}`;
    if (item.price && typeof item.price === 'object') {
      return item.price.formatted || item.price.current || item.price.display || '';
    }
    return '';
  };

  const getDressipiName = (item) =>
    item?.name || item?.title || item?.display_name || item?.garment_id || 'Recommended Item';

  const getDressipiId = (item) =>
    item?.garment_id || item?.product_code || item?.id || item?.item_id || null;

  const getDressipiUrl = (item) => item?.url || item?.product_url || item?.productUrl || '#';

  const renderDressipiPreview = () => {
    if (!dressipiData) {
      return null;
    }

    if (dressipiData.error) {
      return (
        <div className="text-xs text-rose-300">
          {dressipiData.error}
        </div>
      );
    }

    const items = Array.isArray(dressipiData.garment_data)
      ? dressipiData.garment_data.slice(0, 3)
      : [];
    const seed = dressipiData.seed_detail;

    if (!seed && items.length === 0) {
      return (
        <div className="text-xs text-gray-400">
          No similar items were returned for this seed.
        </div>
      );
    }

    return (
      <div className="mt-3 space-y-3">
        {seed && (
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-3">
            {getDressipiImage(seed) ? (
              <img
                src={getDressipiImage(seed)}
                alt={getDressipiName(seed)}
                className="w-16 h-16 object-cover rounded-md border border-white/10"
              />
            ) : (
              <div className="w-16 h-16 rounded-md border border-dashed border-white/10 flex items-center justify-center text-xs text-gray-500">
                No image
              </div>
            )}
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wide text-purple-300">Featured Item</div>
              <div className="text-sm font-semibold text-white line-clamp-2">{getDressipiName(seed)}</div>
              {getDressipiId(seed) && (
                <div className="text-[11px] text-gray-400 mt-1">SKU: {getDressipiId(seed)}</div>
              )}
              {getDressipiPrice(seed) && (
                <div className="text-xs text-purple-300 font-medium mt-1">{getDressipiPrice(seed)}</div>
              )}
            </div>
            <a
              href={getDressipiUrl(seed)}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-purple-300 hover:text-purple-200"
            >
              View ↗
            </a>
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Top Recommendations</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {items.map((item, index) => {
                const image = getDressipiImage(item);
                const name = getDressipiName(item);
                const price = getDressipiPrice(item);
                const id = getDressipiId(item);
                return (
                  <div key={id || index} className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col gap-2">
                    {image ? (
                      <img src={image} alt={name} className="w-full h-24 object-cover rounded-md" />
                    ) : (
                      <div className="w-full h-24 rounded-md border border-dashed border-white/10 flex items-center justify-center text-xs text-gray-500">
                        No image
                      </div>
                    )}
                    <div className="text-xs font-semibold text-white line-clamp-2">{name}</div>
                    {id && <div className="text-[11px] text-gray-400">SKU: {id}</div>}
                    {price && <div className="text-xs text-purple-300 font-medium">{price}</div>}
                    <a
                      href={getDressipiUrl(item)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-purple-300 hover:text-purple-200"
                    >
                      Shop Now ↗
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const normalizeHtmlDocument = (raw) => {
    const input = typeof raw === 'string' ? raw : String(raw ?? '');
    const trimmedContent = input.trim();

    if (!trimmedContent) {
      return '<!DOCTYPE html>\n<html>\n\n</html>';
    }

    let next = input.replace(/^\s+/, '');
    if (!next.toLowerCase().startsWith('<!doctype html')) {
      next = `<!DOCTYPE html>\n${next}`;
    }

    next = next.replace(/\s+$/, '');
    if (!next.toLowerCase().endsWith('</html>')) {
      next = `${next}\n</html>`;
    }

    return next;
  };

  const updateEmailHtml = (value) => {
    if (typeof value === 'function') {
      setEmailHtmlState((prev) => {
        const result = value(prev);
        if (!result || !String(result).trim()) {
          return '';
        }
        return normalizeHtmlDocument(result);
      });
      return;
    }

    if (!value || !String(value).trim()) {
      setEmailHtmlState('');
      return;
    }

    setEmailHtmlState(normalizeHtmlDocument(value));
  };

  const extractPreviewContent = (raw) => {
    if (!raw) return '';

    const withoutDoctype = raw.replace(/<!DOCTYPE[^>]*>/i, '').trim();
    const bodyMatch = withoutDoctype.match(/<body[^>]*>([\s\S]*)<\/body>/i);

    if (bodyMatch) {
      return bodyMatch[1].trim();
    }

    return withoutDoctype.replace(/<\/?html[^>]*>/gi, '').trim();
  };

  const htmlEditorValue =
    emailHtml && emailHtml.trim()
      ? emailHtml
      : normalizeHtmlDocument(emailHtml ?? '');

  const previewHtmlValue = isEditingPreview
    ? extractPreviewContent(emailHtml)
    : emailHtml;

  const previewHtmlForComponent = isEditingPreview
    ? previewHtmlValue ?? ''
    : previewHtmlValue && previewHtmlValue.trim()
      ? previewHtmlValue
      : null;

  const resetWorkspace = () => {
    setMessages([]);
    setInputValue('');
    updateEmailHtml('');
    setEmailContent(null);
    setCurrentPrompt('');
    setEmailImages([]);
    setCampaignBrief('');
    setGeneratedContent('');
    setBrandColors(null);
    setDressipiData(null);
    setDressipiSectionHtml('');
    setShowMappHelper(false);
    setShowTemplates(false);
    setShowSaveModal(false);
    setShowNewEmailModal(false);
    setIsGenerating(false);
    setGenerationStage('');
    setIsGeneratingImage(false);
    setShowClarificationDialog(false);
    setClarifyingQuestions([]);
    setPendingBrief(null);
    setIsEditingPreview(false);
    setTemplateName('');
    setTemplateDescription('');
    setShowHtmlEditor(false);
    setHtmlEditorLayout('split');
    setPreviewMode('desktop');
    setPreviewResetKey((prev) => prev + 1);
  };

  const saveTemplate = async (name, description = '') => {
    if (!name || !name.trim()) {
      throw new Error('Template name is required');
    }

    if (!emailHtml || !emailHtml.trim()) {
      throw new Error('No HTML content available to save.');
    }

    const response = await fetch('http://localhost:3000/api/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim(),
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

    if (!data.success) {
      throw new Error(data.error || 'Failed to save template');
    }

    await loadTemplates();
  };

  const handleStartNewEmail = () => {
    resetWorkspace();
    setShowNewEmailModal(false);
  };

  const handleStartNewEmailWithSave = async () => {
    if (!emailHtml || !emailHtml.trim()) {
      alert('No email has been generated yet. Starting a new email instead.');
      handleStartNewEmail();
      return;
    }

    const defaultName = templateName || `New Email ${new Date().toLocaleDateString()}`;
    const name = window.prompt('Enter a name for the template before starting a new email:', defaultName);

    if (!name) {
      return;
    }

    let description = templateDescription;
    if (!description) {
      const descriptionInput = window.prompt('Optional: add a description for this template (leave blank to skip):', '');
      if (descriptionInput === null) {
        description = '';
      } else {
        description = descriptionInput;
      }
    }

    try {
      await saveTemplate(name, description);
      alert('Template saved successfully!');
      handleStartNewEmail();
    } catch (error) {
      alert(`Failed to save template: ${error.message}`);
    }
  };

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (dressipiDomain) {
      localStorage.setItem('dressipi_domain', dressipiDomain);
    } else {
      localStorage.removeItem('dressipi_domain');
    }

    if (dressipiSeedItemId) {
      localStorage.setItem('dressipi_seed_item_id', dressipiSeedItemId);
    } else {
      localStorage.removeItem('dressipi_seed_item_id');
    }
  }, [dressipiDomain, dressipiSeedItemId]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/settings');
        const data = await response.json();
        if (data.success && data.settings) {
          const domain = data.settings.dressipi_domain || data.dressipi?.domain || '';
          const seed = data.settings.dressipi_seed_item_id || data.dressipi?.seed_item_id || '';
          setDressipiDomain(domain || '');
          setDressipiSeedItemId(seed || '');
          if (domain) localStorage.setItem('dressipi_domain', domain);
          if (seed) localStorage.setItem('dressipi_seed_item_id', seed);
        } else if (data.dressipi) {
          setDressipiDomain(data.dressipi.domain || '');
          setDressipiSeedItemId(data.dressipi.seed_item_id || '');
          if (data.dressipi.domain) localStorage.setItem('dressipi_domain', data.dressipi.domain);
          if (data.dressipi.seed_item_id) localStorage.setItem('dressipi_seed_item_id', data.dressipi.seed_item_id);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
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
    setGenerationStage('🎨 Initializing...');

    // Clear previous progressive results
    setCampaignBrief('');
    setGeneratedContent('');
    setBrandColors(null);
    setEmailImages([]);

    try {
      const dressipiConfig = dressipiDomain && dressipiSeedItemId
        ? {
            domain: dressipiDomain,
            seedItemId: dressipiSeedItemId,
          }
        : null;

      setDressipiData(null);
      setDressipiSectionHtml('');

      const payload = {
        prompt: inputValue,
        lookAndFeel: {
          brandColor: '#6366f1',
          accentColor: '#ec4899',
        },
        streamProgress: true,
      };

      if (dressipiConfig) {
        payload.dressipi = dressipiConfig;
      }

      const response = await fetch('http://localhost:3000/api/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Handle SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonData = JSON.parse(line.slice(6));

            if (jsonData.type === 'progress') {
              setGenerationStage(jsonData.message);
            } else if (jsonData.type === 'stage1_complete') {
              // Stage 1: Show campaign brief
              setGenerationStage(jsonData.message);
              setCampaignBrief(jsonData.data?.brief || '');
            } else if (jsonData.type === 'stage2_complete') {
              // Stage 2: Show brand colors (REORDERED)
              setGenerationStage(jsonData.message);
              setBrandColors(jsonData.data?.brandData || null);
            } else if (jsonData.type === 'stage3_complete') {
              // Stage 3: Show images (REORDERED)
              setGenerationStage(jsonData.message);
              setEmailImages(jsonData.data?.images || []);
            } else if (jsonData.type === 'stage4_complete') {
              // Stage 4: Show generated content (REORDERED)
              setGenerationStage(jsonData.message);
              setGeneratedContent(jsonData.data?.content || '');
            } else if (jsonData.type === 'dressipi_fetch') {
              setGenerationStage(jsonData.message);
            } else if (jsonData.type === 'dressipi_complete') {
              setGenerationStage(jsonData.message);
              setDressipiData(jsonData.data?.dressipi || null);
            } else if (jsonData.type === 'dressipi_error') {
              setGenerationStage(jsonData.message);
              setDressipiData({ error: jsonData.message });
            } else if (jsonData.type === 'complete') {
              finalResult = jsonData.result;
            } else if (jsonData.type === 'error') {
              throw new Error(jsonData.error);
            }
          }
        }
      }

      const data = finalResult;

      if (!data) {
        throw new Error('No response received from server');
      }

      // Handle requiresSettings
      if (data.requiresSettings) {
        setIsGenerating(false);
        setGenerationStage('');
        setDressipiData(null);
        setDressipiSectionHtml('');
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
        setDressipiData(null);
        setDressipiSectionHtml('');
        setClarifyingQuestions(data.questions);
        setPendingBrief(data.brief);
        setShowClarificationDialog(true);
        setInputValue('');
        return;
      }

      if (data.success) {
        setGenerationStage('✅ Campaign complete!');

        setDressipiData(data.dressipi || null);
        setDressipiSectionHtml(data.dressipiSection || '');

        // Add AI response to chat
        const imageCount = data.images?.length || 0;
        const recommendationCount = data.dressipi?.garment_data?.length || 0;
        const dressipiMessage = recommendationCount > 0
          ? ` and included ${recommendationCount} Dressipi recommendation${recommendationCount > 1 ? 's' : ''}`
          : '';
        const aiMessage = {
          role: 'assistant',
          content: `I've created your professional email campaign: "${data.content.subject}"${imageCount > 0 ? ` with ${imageCount} custom AI-generated image${imageCount > 1 ? 's' : ''}` : ''}${dressipiMessage}`
        };
        setMessages(prev => [...prev, aiMessage]);

        // Update email preview and content
        updateEmailHtml(data.html);
        setEmailContent(data.content);
        setEmailImages(data.images || []);
      } else {
        setDressipiData(null);
        setDressipiSectionHtml('');
        const errorMessage = {
          role: 'assistant',
          content: `Error: ${data.error}`
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      setDressipiData(null);
      setDressipiSectionHtml('');
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
    try {
      await saveTemplate(templateName, templateDescription);
      alert('Template saved successfully!');
      setShowSaveModal(false);
      setTemplateName('');
      setTemplateDescription('');
    } catch (error) {
      alert(`Failed to save template: ${error.message}`);
    }
  };

  const loadTemplate = async (templateId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/templates/${templateId}`);
      const data = await response.json();

      if (data.success) {
        updateEmailHtml(data.template.html_content);
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
        updateEmailHtml(newHtml);

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
      setGenerationStage('🔄 Initializing...');

      // Clear previous progressive results
      setCampaignBrief('');
      setGeneratedContent('');
      setBrandColors(null);
      setEmailImages([]);

      const dressipiConfig = dressipiDomain && dressipiSeedItemId
        ? {
            domain: dressipiDomain,
            seedItemId: dressipiSeedItemId,
          }
        : null;

      setDressipiData(null);
      setDressipiSectionHtml('');

      const payload = {
        brief: pendingBrief,
        answers: answers,
        lookAndFeel: {
          brandColor: '#6366f1',
          accentColor: '#ec4899',
        },
        streamProgress: true,
      };

      if (dressipiConfig) {
        payload.dressipi = dressipiConfig;
      }

      const response = await fetch('http://localhost:3000/api/generate-email-with-answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Handle SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonData = JSON.parse(line.slice(6));

            if (jsonData.type === 'progress') {
              setGenerationStage(jsonData.message);
            } else if (jsonData.type === 'stage1_complete') {
              // Stage 1: Show campaign brief
              setGenerationStage(jsonData.message);
              setCampaignBrief(jsonData.data?.brief || '');
            } else if (jsonData.type === 'stage2_complete') {
              // Stage 2: Show brand colors (REORDERED)
              setGenerationStage(jsonData.message);
              setBrandColors(jsonData.data?.brandData || null);
            } else if (jsonData.type === 'stage3_complete') {
              // Stage 3: Show images (REORDERED)
              setGenerationStage(jsonData.message);
              setEmailImages(jsonData.data?.images || []);
            } else if (jsonData.type === 'stage4_complete') {
              // Stage 4: Show generated content (REORDERED)
              setGenerationStage(jsonData.message);
              setGeneratedContent(jsonData.data?.content || '');
            } else if (jsonData.type === 'dressipi_fetch') {
              setGenerationStage(jsonData.message);
            } else if (jsonData.type === 'dressipi_complete') {
              setGenerationStage(jsonData.message);
              setDressipiData(jsonData.data?.dressipi || null);
            } else if (jsonData.type === 'dressipi_error') {
              setGenerationStage(jsonData.message);
              setDressipiData({ error: jsonData.message });
            } else if (jsonData.type === 'complete') {
              finalResult = jsonData.result;
            } else if (jsonData.type === 'error') {
              throw new Error(jsonData.error);
            }
          }
        }
      }

      const data = finalResult;

      if (!data) {
        throw new Error('No response received from server');
      }

      if (data.success) {
        setGenerationStage('✅ Campaign complete!');

        setDressipiData(data.dressipi || null);
        setDressipiSectionHtml(data.dressipiSection || '');

        // Add AI response to chat
        const imageCount = data.images?.length || 0;
        const recommendationCount = data.dressipi?.garment_data?.length || 0;
        const dressipiMessage = recommendationCount > 0
          ? ` and included ${recommendationCount} Dressipi recommendation${recommendationCount > 1 ? 's' : ''}`
          : '';
        const aiMessage = {
          role: 'assistant',
          content: `I've refined your campaign based on your answers: "${data.content.subject}"${imageCount > 0 ? ` with ${imageCount} custom AI-generated image${imageCount > 1 ? 's' : ''}` : ''}${dressipiMessage}`
        };
        setMessages(prev => [...prev, aiMessage]);

        // Update email preview and content
        updateEmailHtml(data.html);
        setEmailContent(data.content);
        setEmailImages(data.images || []);
      } else {
        setDressipiData(null);
        setDressipiSectionHtml('');
        const errorMessage = {
          role: 'assistant',
          content: `Error: ${data.error}`
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      setDressipiData(null);
      setDressipiSectionHtml('');
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

  const previewPane = (
    <div
      className={`transition-all duration-300 ${
        previewMode === 'mobile' ? 'flex justify-center py-6' : 'mx-auto'
      }`}
    >
      <div
        className={`transition-all duration-300 ${
          previewMode === 'mobile' ? 'w-[380px] max-w-full' : 'max-w-2xl w-full'
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
              previewMode === 'mobile' ? 'rounded-[22px] bg-white' : 'rounded-lg bg-white'
            }`}
          >
            <InteractiveEmailPreview
              key={previewResetKey}
              html={previewHtmlForComponent}
              onRegenerateImage={handleRegenerateImage}
              isGeneratingImage={isGeneratingImage}
              isEditable={isEditingPreview}
              onHtmlChange={updateEmailHtml}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const htmlEditorPane = (
    <div className="bg-slate-900 rounded-lg border border-white/10 overflow-hidden flex flex-col h-full">
      <div className="px-4 py-2 bg-black/40 border-b border-white/10 flex items-center justify-between">
        <span className="text-xs text-gray-400 font-mono">HTML + Mapp Template</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(emailHtml ?? '')}
            disabled={!emailHtml}
            className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            📋 Copy
          </button>
        </div>
      </div>
      <textarea
        value={htmlEditorValue}
        onChange={(e) => updateEmailHtml(e.target.value)}
        placeholder="Dein HTML erscheint hier. Du kannst es direkt bearbeiten oder neues HTML einfügen."
        className="flex-1 w-full bg-black/50 text-gray-100 font-mono text-xs leading-5 p-4 border-none outline-none resize-none"
        spellCheck={false}
      />
    </div>
  );

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
              onClick={() => setShowNewEmailModal(true)}
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              ✨ New Email
            </button>
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

              {/* Progressive Results Display - REORDERED to match new pipeline */}
              {/* Stage 1: Campaign Brief */}
              {campaignBrief && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    📋
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex-1">
                    <h3 className="text-sm font-semibold text-blue-300 mb-2">📋 Stage 1: Campaign Strategy</h3>
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">{campaignBrief}</pre>
                  </div>
                </div>
              )}

              {/* Stage 2: Brand Colors */}
              {brandColors && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
                    🎨
                  </div>
                  <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4 flex-1">
                    <h3 className="text-sm font-semibold text-pink-300 mb-2">🎨 Stage 2: Brand Colors</h3>
                    <div className="flex flex-wrap gap-2">
                      {brandColors.primaryColor && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded border border-white/20" style={{ backgroundColor: brandColors.primaryColor }}></div>
                          <span className="text-xs text-gray-300">Primary: {brandColors.primaryColor}</span>
                        </div>
                      )}
                      {brandColors.accentColor && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded border border-white/20" style={{ backgroundColor: brandColors.accentColor }}></div>
                          <span className="text-xs text-gray-300">Accent: {brandColors.accentColor}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Stage 3: Generated Images */}
              {emailImages.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                    🖼️
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex-1">
                    <h3 className="text-sm font-semibold text-yellow-300 mb-3">🖼️ Stage 3: Generated Images (from brief)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {emailImages.map((img, idx) => (
                        <div key={idx} className="bg-black/20 rounded-lg overflow-hidden border border-white/10">
                          <img src={img.url} alt={img.prompt} className="w-full h-32 object-cover" />
                          <div className="p-2">
                            <p className="text-xs text-gray-400 line-clamp-2">{img.prompt}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Stage 4: Email Content */}
              {generatedContent && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                    ✍️
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex-1">
                    <h3 className="text-sm font-semibold text-green-300 mb-2">✍️ Stage 4: Email Content (using colors & images)</h3>
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">{generatedContent}</pre>
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
          <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Dressipi Similar Items</p>
                <p className="text-xs text-gray-400">
                  {dressipiDomain
                    ? dressipiSeedItemId
                      ? `Domain: ${dressipiDomain}`
                      : 'Seed item missing; configure below'
                    : 'Domain not configured'}
                </p>
              </div>
              <Link to="/settings#dressipi-similar-items" className="text-xs text-purple-300 hover:text-purple-200">
                Configure ↗
              </Link>
            </div>
            {dressipiDomain ? (
              <div className="space-y-2">
                <label className="block text-xs text-gray-400">Seed Item ID</label>
                <input
                  type="text"
                  value={dressipiSeedItemId}
                  onChange={(e) => setDressipiSeedItemId(e.target.value)}
                  placeholder="Enter Dressipi item ID"
                  className="w-full px-3 py-2 bg-black/40 text-white border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-sm placeholder:text-gray-500"
                />
                {!dressipiSeedItemId && (
                  <p className="text-xs text-rose-300">
                    Provide a seed item ID to include Dressipi recommendations.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-rose-300">
                Add your Dressipi domain in Settings to enable product recommendations.
              </p>
            )}
            {renderDressipiPreview()}
            {dressipiSectionHtml && (
              <details className="text-xs text-gray-400">
                <summary className="cursor-pointer text-purple-300">Show injected HTML snippet</summary>
                <pre className="mt-2 whitespace-pre-wrap break-all bg-black/40 border border-white/10 rounded-lg p-3 text-[11px] text-gray-300">
{dressipiSectionHtml}
                </pre>
              </details>
            )}
          </div>
          <div className="flex justify-between items-center mt-3">
            <div className="flex flex-col gap-1">
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
                  <Link
                    to={{ pathname: '/settings', hash: '#dressipi-similar-items' }}
                    className="text-xs text-gray-500 hover:text-purple-300 transition-colors inline-flex items-center gap-1"
                  >
                    ⚙️ Configure Similar Items API
                  </Link>
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

          {/* Right Side: Preview & Code */}
          <div className="flex flex-col bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 bg-black/20 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-purple-400 text-xl">✨</span>
                <h2 className="font-semibold text-lg">
                  Layout Preview &amp; HTML
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
                <button
                  onClick={() => setIsEditingPreview((prev) => !prev)}
                  disabled={(!emailHtml && !isEditingPreview) || (showHtmlEditor && htmlEditorLayout === 'full')}
                  aria-pressed={isEditingPreview}
                  className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                    isEditingPreview
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 border-transparent shadow-lg shadow-emerald-500/30'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {isEditingPreview ? '✅ Done' : '✏️ Edit Preview'}
                </button>
                <button
                  onClick={() =>
                    setShowHtmlEditor((prev) => {
                      const next = !prev;
                      if (!next) {
                        setHtmlEditorLayout('split');
                      }
                      return next;
                    })
                  }
                  aria-pressed={showHtmlEditor}
                  className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                    showHtmlEditor
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 border-transparent shadow-lg shadow-blue-500/20'
                      : 'bg-white/5 hover:bg-white/10 border-white/10'
                  }`}
                >
                  {showHtmlEditor ? '🧾 Hide HTML' : '🧾 HTML Editor'}
                </button>
                {showHtmlEditor && (
                  <div className="flex border border-white/10 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setHtmlEditorLayout('split')}
                      aria-pressed={htmlEditorLayout === 'split'}
                      className={`text-xs px-3 py-1 transition-colors ${
                        htmlEditorLayout === 'split'
                          ? 'bg-white/10'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      ⫽ Split
                    </button>
                    <button
                      onClick={() => {
                        setHtmlEditorLayout('full');
                        setIsEditingPreview(false);
                      }}
                      aria-pressed={htmlEditorLayout === 'full'}
                      className={`text-xs px-3 py-1 border-l border-white/10 transition-colors ${
                        htmlEditorLayout === 'full'
                          ? 'bg-white/10'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      ⛶ Full Screen
                    </button>
                  </div>
                )}
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
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
              {showHtmlEditor ? (
                htmlEditorLayout === 'split' ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
                    <div className="flex flex-col h-full xl:order-1">{previewPane}</div>
                    <div className="flex flex-col h-full xl:order-2">{htmlEditorPane}</div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col">{htmlEditorPane}</div>
                )
              ) : (
                <div className="h-full flex flex-col">{previewPane}</div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Save Template Modal */}
      {showNewEmailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full mx-4 space-y-4">
            <div>
              <h3 className="text-xl font-bold mb-2">Start a New Email?</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                You are about to delete the current content and start a new email. Do you want to proceed?
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <button
                onClick={handleStartNewEmail}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-lg font-medium transition-all text-sm"
              >
                Yes
              </button>
              <button
                onClick={handleStartNewEmailWithSave}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-lg font-medium transition-all text-sm"
              >
                Yes &amp; Save Template
              </button>
              <button
                onClick={() => setShowNewEmailModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-sm"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

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
