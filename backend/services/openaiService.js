const OpenAI = require('openai');
const { loadPrompt } = require('../utils/promptLoader');
const { fetchRelatedItems } = require('./dressipiService');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanGeneratedHtml(rawHtml) {
  if (!rawHtml) {
    return '';
  }

  let output = rawHtml.trim();

  // Remove fenced code blocks
  output = output.replace(/```(?:html|HTML)?/g, '').replace(/```/g, '');

  // Strip everything before the actual document starts
  const lower = output.toLowerCase();
  const doctypeIdx = lower.indexOf('<!doctype');
  const htmlIdx = lower.indexOf('<html');
  let startIdx = -1;

  if (doctypeIdx !== -1) {
    startIdx = doctypeIdx;
  } else if (htmlIdx !== -1) {
    startIdx = htmlIdx;
  }

  if (startIdx > 0) {
    output = output.slice(startIdx);
  }

  // Remove anything after closing html tag or additional fences
  const fenceIdx = output.indexOf('```');
  if (fenceIdx !== -1) {
    output = output.slice(0, fenceIdx);
  }

  const lastHtmlClose = output.toLowerCase().lastIndexOf('</html>');
  if (lastHtmlClose !== -1) {
    output = output.slice(0, lastHtmlClose + '</html>'.length);
  }

  return output.trim();
}

/**
 * Generate email content using OpenAI GPT-4
 */
async function generateEmailContent(userPrompt, lookAndFeel = {}) {
  try {
    // Load prompt from file
    const prompt = loadPrompt('email_content_generation');

    const modelToUse = prompt.settings.model || "gpt-5";
    const completionParams = {
      model: modelToUse,
      messages: [
        { role: "system", content: prompt.systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: prompt.settings.responseFormat || { type: "json_object" },
    };

    // Only add temperature if not using gpt-5 (which doesn't support it)
    if (!modelToUse.includes('gpt-5')) {
      completionParams.temperature = prompt.settings.temperature || 0.7;
    }

    const completion = await openai.chat.completions.create(completionParams);

    const content = JSON.parse(completion.choices[0].message.content);
    return { success: true, content };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate HTML email template from content text
 */
async function generateEmailHTMLFromText(contentText, lookAndFeel = {}, generatedImages = []) {
  try {
    // Extract brand styling with fallbacks
    const {
      primaryColor = lookAndFeel.brandColor || '#6366f1',
      accentColor = '#ec4899',
      backgroundColor = '#FFFFFF',
      headingFont = lookAndFeel.fontFamily || 'Georgia, serif',
      bodyFont = lookAndFeel.fontFamily || 'Arial, sans-serif',
      brandVoice = 'Professional and engaging',
      logoUrl = ''
    } = lookAndFeel;

    // Build prompt with content and images
    let imagesInfo = '';
    if (generatedImages.length > 0) {
      imagesInfo = '\n\nGenerated Images (use these in the email):\n';
      generatedImages.forEach((img, idx) => {
        imagesInfo += `Image ${idx + 1}: ${img.url}\nDescription: ${img.prompt}\n\n`;
      });
    }

    const htmlPrompt = `Create a mobile-first HTML email template based on this content:

${contentText}

${imagesInfo}

Brand Style Guide:
- Primary Color (hex): ${primaryColor}
- Accent Color (hex): ${accentColor}
- Background Color (hex): ${backgroundColor}
- Heading Font: ${headingFont}
- Body Font: ${bodyFont}
- Brand Personality: ${brandVoice}
${logoUrl ? `- Logo URL: ${logoUrl}` : ''}

IMPORTANT: Use these EXACT brand colors in the HTML. These are part of the brand's identity.

Create a responsive, mobile-first HTML email using Mapp Engage syntax for personalization (e.g., <%\${user['FirstName']}%>).`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: 'You are an expert Mapp Engage email template developer. Create responsive, mobile-first HTML email templates with proper Mapp syntax.'
        },
        { role: "user", content: htmlPrompt }
      ],
      // No temperature for gpt-5 - uses default (1)
    });

    const rawHtml = completion.choices[0].message.content;
    const html = cleanGeneratedHtml(rawHtml);
    return { success: true, html };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate HTML email template from content (old function - keeping for compatibility)
 */
async function generateEmailHTML(emailContent, lookAndFeel = {}, generatedImages = []) {
  // Just convert to text and use the new function
  const contentText = `Subject Line: ${emailContent.subject}
Preheader: ${emailContent.preheader}
Headline: ${emailContent.headline}

Body:
${emailContent.body}

Call-to-Action: ${emailContent.cta}
Footer: ${emailContent.footer}`;

  return generateEmailHTMLFromText(contentText, lookAndFeel, generatedImages);
}


/**
 * Generate complete email campaign with Creative Director (NEW ENHANCED FLOW)
 * @param {string} userPrompt - User's request
 * @param {object} lookAndFeel - Brand styling
 * @param {object} companySettings - Company profile from settings
 * @param {function} onProgress - Optional callback for progress updates (message) => void
 * @returns {Promise<object>} Complete campaign or clarifying questions
 */
async function generateEmailCampaign(userPrompt, lookAndFeel = {}, companySettings = null, onProgress = null, options = {}) {
  try {
    const { analyzeAndEnhancePrompt, generateContentFromBrief } = require('./creativeDirector');
    const dressipiOptions = options?.dressipi || null;
    let dressipiData = null;
    let dressipiSectionHtml = null;

    // STAGE 1: Creative Director Analysis
    console.log('🎨 Stage 1: Creative Director analyzing request...');
    if (onProgress) onProgress('🎨 Stage 1/5: Creative Director analyzing your request...', 'progress');
    const directorResult = await analyzeAndEnhancePrompt(userPrompt, companySettings);

    if (!directorResult.success) {
      return directorResult;
    }

    const briefText = directorResult.briefText;

    // Send brief result
    if (onProgress) onProgress(briefText, 'stage1_complete', { brief: briefText });

    // Check if settings are required or clarification needed
    // (Creative Director can indicate this in the text)
    if (briefText.includes('REQUIRES_SETTINGS') || briefText.includes('requiresSettings')) {
      return {
        success: false,
        requiresSettings: true,
        message: 'Please configure your company settings first to generate personalized campaigns.',
        redirectTo: 'settings'
      };
    }

    // STAGE 2: Extract brand alignment from brief (FAST - do this first!)
    console.log('🎨 Stage 2: Extracting brand colors and fonts from brief...');
    if (onProgress) onProgress('🎨 Stage 2/5: Extracting brand colors and fonts from brief...', 'progress');
    const extractedBrandData = extractBrandAlignment(briefText);

    // Merge extracted brand data with provided lookAndFeel (extracted data takes precedence)
    const enhancedLookAndFeel = {
      ...lookAndFeel,
      ...extractedBrandData
    };

    // Send brand data result
    if (onProgress) onProgress('✅ Stage 2 complete: Brand colors extracted!', 'stage2_complete', { brandData: extractedBrandData });

    // STAGE 3: Extract and generate images from brief (Images specified in brief!)
    console.log('🖼️ Stage 3: Generating images from creative brief...');
    if (onProgress) onProgress('🖼️ Stage 3/5: Generating brand-aligned images from brief...', 'progress');
    const imagePrompts = extractImagePrompts(briefText);
    const generatedImages = await generateImages(imagePrompts);

    // Send images result
    if (onProgress) onProgress('✅ Stage 3 complete: Images generated!', 'stage3_complete', { images: generatedImages });

    // STAGE 4: Generate Content from Brief (Now with colors and images available!)
    console.log('✍️ Stage 4: Generating content from expert brief...');
    if (onProgress) onProgress('✍️ Stage 4/5: Generating content from expert brief...', 'progress');
    const contentResult = await generateContentFromBrief(briefText);

    if (!contentResult.success) {
      return contentResult;
    }

    const contentText = contentResult.contentText;

    // Send content result
    if (onProgress) onProgress('✅ Stage 4 complete: Content generated!', 'stage4_complete', { content: contentText });

    // Optional: Fetch Dressipi similar items before HTML generation
    if (dressipiOptions && (dressipiOptions.domain || dressipiOptions.customerName) && dressipiOptions.seedItemId) {
      try {
        if (onProgress) onProgress('🛍️ Fetching similar items from Dressipi...', 'dressipi_fetch');
        dressipiData = await fetchRelatedItems({
          domain: dressipiOptions.domain,
          customerName: dressipiOptions.customerName,
          itemId: dressipiOptions.seedItemId,
          queryOptions: dressipiOptions.queryOptions || {},
        });
        if (onProgress) onProgress('✅ Retrieved Dressipi similar items', 'dressipi_complete', { dressipi: dressipiData });
      } catch (dressipiError) {
        console.error('Dressipi fetch failed:', dressipiError);
        dressipiData = { success: false, error: dressipiError.message };
        if (onProgress) onProgress(`⚠️ Dressipi fetch failed: ${dressipiError.message}`, 'dressipi_error');
      }
    }

    // STAGE 5: Generate Mobile-First HTML with brand-aligned styling
    console.log('📱 Stage 5: Generating mobile-first HTML template with brand styling...');
    if (onProgress) onProgress('📱 Stage 5/5: Generating mobile-first HTML with brand styling...', 'progress');
    const htmlResult = await generateEmailHTMLFromText(contentText, enhancedLookAndFeel, generatedImages);

    if (!htmlResult.success) {
      return htmlResult;
    }

    let finalHtml = htmlResult.html;
    if (dressipiData && Array.isArray(dressipiData.garment_data) && dressipiData.garment_data.length > 0) {
      dressipiSectionHtml = buildDressipiHtmlSection({
        seedItem: dressipiData.seed_detail || null,
        items: dressipiData.garment_data,
        lookAndFeel: enhancedLookAndFeel,
      });
      finalHtml = injectDressipiSection(finalHtml, dressipiSectionHtml);
    }

    console.log('✅ Campaign generation complete!');

    // Parse basic content fields for frontend display
    const content = parseBasicContent(contentText);

    return {
      success: true,
      content: content,
      html: finalHtml,
      images: generatedImages,
      brief: briefText,
      dressipi: dressipiData,
      dressipiSection: dressipiSectionHtml
    };

  } catch (error) {
    console.error('Email Generation Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Extract brand colors and fonts from Creative Director's brief
 * @param {string} briefText - The Creative Director's campaign brief
 * @returns {object} Extracted brand styling
 */
function extractBrandAlignment(briefText) {
  const brandData = {};

  // Extract hex color codes
  const hexMatches = briefText.matchAll(/#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})/g);
  const hexColors = Array.from(hexMatches).map(m => '#' + m[1].toUpperCase());

  // Try to identify primary, accent, and background colors from context
  const primaryMatch = briefText.match(/primary\s+color[:\s]+#?([0-9A-Fa-f]{6})/i);
  const accentMatch = briefText.match(/accent\s+color[:\s]+#?([0-9A-Fa-f]{6})/i);
  const backgroundMatch = briefText.match(/background\s+color[:\s]+#?([0-9A-Fa-f]{6})/i);

  if (primaryMatch) brandData.primaryColor = '#' + primaryMatch[1].toUpperCase();
  if (accentMatch) brandData.accentColor = '#' + accentMatch[1].toUpperCase();
  if (backgroundMatch) brandData.backgroundColor = '#' + backgroundMatch[1].toUpperCase();

  // Fallback to first found colors if specific ones not labeled
  if (!brandData.primaryColor && hexColors.length > 0) brandData.primaryColor = hexColors[0];
  if (!brandData.accentColor && hexColors.length > 1) brandData.accentColor = hexColors[1];
  if (!brandData.backgroundColor && hexColors.length > 2) brandData.backgroundColor = hexColors[2];

  // Extract fonts
  const headingFontMatch = briefText.match(/heading[s]?\s+font[:\s]+([^,\n]+(?:,\s*[^\n]+)?)/i);
  const bodyFontMatch = briefText.match(/body\s+font[:\s]+([^,\n]+(?:,\s*[^\n]+)?)/i);

  if (headingFontMatch) brandData.headingFont = headingFontMatch[1].trim();
  if (bodyFontMatch) brandData.bodyFont = bodyFontMatch[1].trim();

  // Extract brand voice
  const brandVoiceMatch = briefText.match(/brand\s+voice[:\s]+([^\n]+)/i) ||
                          briefText.match(/tone[:\s]+([^\n]+)/i);
  if (brandVoiceMatch) brandData.brandVoice = brandVoiceMatch[1].trim();

  console.log('🎨 Extracted brand alignment:', brandData);

  return brandData;
}

/**
 * Extract image prompts from brief text
 */
function extractImagePrompts(briefText) {
  const prompts = [];
  // Look for image sections marked in the brief
  const imageMatches = briefText.matchAll(/(?:Image \d+|Hero Image|Product Image)[\s\S]*?(?:Prompt|Description):?\s*([^\n]+(?:\n(?!\n)[^\n]+)*)/gi);

  for (const match of imageMatches) {
    if (match[1]) {
      prompts.push(match[1].trim());
    }
  }

  // Default to 1-2 generic prompts if none found
  if (prompts.length === 0) {
    prompts.push('Professional email marketing photography, high quality, brand-aligned aesthetic, clean composition');
  }

  return prompts.slice(0, 3); // Max 3 images
}

/**
 * Generate multiple images from prompts
 */
async function generateImages(prompts) {
  const images = [];
  for (const prompt of prompts) {
    const result = await generateImage(prompt, { quality: 'hd', style: 'vivid' });
    if (result.success) {
      images.push({
        url: result.imageUrl,
        prompt: prompt,
        revisedPrompt: result.revisedPrompt
      });
    }
  }
  return images;
}

/**
 * Parse basic content fields from content text for frontend display
 */
function parseBasicContent(contentText) {
  const subjectMatch = contentText.match(/Subject(?:\s+Line)?:\s*(.+)/i);
  const preheaderMatch = contentText.match(/Preheader:\s*(.+)/i);
  const headlineMatch = contentText.match(/Headline:\s*(.+)/i);
  const ctaMatch = contentText.match(/(?:Call[- ]to[- ]Action|CTA):\s*(.+)/i);

  return {
    subject: subjectMatch ? subjectMatch[1].trim() : 'Your Email Campaign',
    preheader: preheaderMatch ? preheaderMatch[1].trim() : '',
    headline: headlineMatch ? headlineMatch[1].trim() : '',
    body: contentText,
    cta: ctaMatch ? ctaMatch[1].trim() : 'Learn More',
    ctaUrl: '#',
    footer: 'Unsubscribe | View Online'
  };
}

function buildDressipiHtmlSection({ seedItem, items, lookAndFeel = {} }) {
  const primaryColor = lookAndFeel.primaryColor || lookAndFeel.brandColor || '#6366f1';
  const accentColor = lookAndFeel.accentColor || '#ec4899';
  const backgroundColor = lookAndFeel.backgroundColor || '#0f172a';
  const headerTextColor = '#ffffff';

  const normalizeImage = (item) =>
    item?.thumbnail_image_url ||
    item?.image_url ||
    (Array.isArray(item?.feed_image_urls) ? item.feed_image_urls[0] : null) ||
    '';

  const normalizePrice = (item) => {
    if (!item) return '';
    if (typeof item.price === 'string') return item.price;
    if (typeof item.price === 'number') return `$${item.price}`;
    if (item.price && typeof item.price === 'object') {
      return item.price.formatted || item.price.current || item.price.display || '';
    }
    return '';
  };

  const normalizeUrl = (item) => item?.url || item?.product_url || item?.productUrl || '#';
  const normalizeName = (item) => item?.name || item?.title || item?.display_name || item?.garment_id || 'Recommended Item';

  const renderCard = (item, index, total) => {
    if (!item) return '';
    const imageUrl = normalizeImage(item);
    const name = normalizeName(item);
    const price = normalizePrice(item);
    const link = normalizeUrl(item);
    const width = Math.floor(100 / total);
    const displayId = item?.garment_id || item?.product_code || item?.id || item?.item_id || null;

    return `
      <td align="center" valign="top" width="${width}%" style="padding:12px 6px;">
        <table role="presentation" width="100%" style="border-collapse:collapse;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${imageUrl
            ? `<tr>
                 <td align="center" style="padding:0;">
                   <a href="${link}" target="_blank" style="display:block;">
                     <img src="${imageUrl}" alt="${name}" width="100%" style="display:block;width:100%;height:auto;">
                   </a>
                 </td>
               </tr>`
            : ''}
          <tr>
            <td align="left" style="padding:16px;">
              <div style="font-family:'Helvetica Neue', Arial, sans-serif;font-size:15px;font-weight:600;color:#0f172a;line-height:1.4;">
                ${name}
              </div>
              ${displayId ? `<div style="margin-top:4px;font-family:'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#64748b;">SKU: ${displayId}</div>` : ''}
              ${price ? `<div style="margin-top:8px;font-family:'Helvetica Neue', Arial, sans-serif;font-size:15px;font-weight:600;color:${accentColor};">${price}</div>` : ''}
              <div style="margin-top:12px;">
                <a href="${link}" target="_blank" style="display:inline-block;padding:10px 16px;background:${primaryColor};color:#ffffff;text-decoration:none;font-family:'Helvetica Neue', Arial, sans-serif;font-size:13px;border-radius:9999px;">
                  Shop Now
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    `;
  };

  const selectedItems = Array.isArray(items) ? items.slice(0, 3) : [];
  const cardsHtml = selectedItems.map((item, idx) => renderCard(item, idx, Math.max(selectedItems.length, 1))).join('');

  const seedImage = normalizeImage(seedItem);
  const seedName = normalizeName(seedItem);
  const seedPrice = normalizePrice(seedItem);
  const seedLink = normalizeUrl(seedItem);
  const seedId = seedItem?.garment_id || seedItem?.product_code || seedItem?.id || null;

  const seedHtml = seedItem
    ? `
      <table role="presentation" width="100%" style="border-collapse:collapse;margin-bottom:16px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        ${seedImage
          ? `<tr>
               <td style="padding:0;">
                 <a href="${seedLink}" target="_blank" style="display:block;">
                   <img src="${seedImage}" alt="${seedName}" width="100%" style="display:block;width:100%;height:auto;">
                 </a>
               </td>
             </tr>`
          : ''}
        <tr>
          <td style="padding:20px;">
            <div style="font-family:'Helvetica Neue', Arial, sans-serif;font-size:14px;font-weight:600;color:${accentColor};letter-spacing:0.08em;text-transform:uppercase;">Featured Look</div>
            <div style="font-family:'Helvetica Neue', Arial, sans-serif;font-size:22px;font-weight:700;color:#0f172a;line-height:1.4;margin-top:6px;">${seedName}</div>
            ${seedId ? `<div style="margin-top:6px;font-family:'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#64748b;">SKU: ${seedId}</div>` : ''}
            ${seedPrice ? `<div style="margin-top:12px;font-family:'Helvetica Neue', Arial, sans-serif;font-size:18px;font-weight:600;color:${accentColor};">${seedPrice}</div>` : ''}
            <div style="margin-top:16px;">
              <a href="${seedLink}" target="_blank" style="display:inline-block;padding:12px 20px;background:${primaryColor};color:#ffffff;text-decoration:none;font-family:'Helvetica Neue', Arial, sans-serif;font-size:14px;border-radius:9999px;">
                View Product
              </a>
            </div>
          </td>
        </tr>
      </table>
    `
    : '';

  return `
    <!-- Dressipi Similar Items -->
    <table role="presentation" width="100%" style="border-collapse:collapse;margin:0 auto 24px auto;background:${backgroundColor};">
      <tr>
        <td style="padding:24px 20px 32px 20px;">
          <table role="presentation" width="100%" style="border-collapse:collapse;margin-bottom:12px;">
            <tr>
              <td align="left" style="font-family:'Helvetica Neue', Arial, sans-serif;font-size:18px;font-weight:700;color:${headerTextColor};">
                Recommended for You
              </td>
              <td align="right" style="font-family:'Helvetica Neue', Arial, sans-serif;font-size:13px;color:${headerTextColor};">
                Powered by Dressipi
              </td>
            </tr>
          </table>
          ${seedHtml}
          ${cardsHtml
            ? `<table role="presentation" width="100%" style="border-collapse:collapse;" cellspacing="0" cellpadding="0">
                <tr>
                  ${cardsHtml}
                </tr>
              </table>`
            : ''}
        </td>
      </tr>
    </table>
  `;
}

function injectDressipiSection(html, sectionHtml) {
  if (!sectionHtml) {
    return html;
  }

  const lower = html.toLowerCase();
  const bodyCloseIdx = lower.lastIndexOf('</body>');

  if (bodyCloseIdx !== -1) {
    return `${html.slice(0, bodyCloseIdx)}${sectionHtml}\n${html.slice(bodyCloseIdx)}`;
  }

  return `${html}\n${sectionHtml}`;
}

/**
 * Generate campaign after user answers clarifying questions
 * @param {string} originalBriefText - Original brief text from Creative Director
 * @param {object} userAnswers - User's answers to questions
 * @param {object} lookAndFeel - Brand styling
 * @param {function} onProgress - Optional callback for progress updates
 * @returns {Promise<object>} Complete campaign
 */
async function generateCampaignWithAnswers(originalBriefText, userAnswers, lookAndFeel = {}, onProgress = null, options = {}) {
  try {
    const { refineBrief, generateContentFromBrief } = require('./creativeDirector');
    const dressipiOptions = options?.dressipi || null;
    let dressipiData = null;
    let dressipiSectionHtml = null;

    // Refine brief with user answers
    console.log('🔄 Refining brief with user feedback...');
    if (onProgress) onProgress('🔄 Stage 1/5: Refining campaign with your answers...', 'progress');
    const refinedResult = await refineBrief(originalBriefText, userAnswers);

    if (!refinedResult.success) {
      return refinedResult;
    }

    const briefText = refinedResult.briefText;

    // Send brief result
    if (onProgress) onProgress('✅ Stage 1 complete: Campaign refined!', 'stage1_complete', { brief: briefText });

    // Extract brand alignment from refined brief (FAST - do this first!)
    console.log('🎨 Extracting brand colors and fonts from refined brief...');
    if (onProgress) onProgress('🎨 Stage 2/5: Extracting brand colors and fonts...', 'progress');
    const extractedBrandData = extractBrandAlignment(briefText);

    // Merge extracted brand data with provided lookAndFeel
    const enhancedLookAndFeel = {
      ...lookAndFeel,
      ...extractedBrandData
    };

    // Send brand data result
    if (onProgress) onProgress('✅ Stage 2 complete: Brand colors extracted!', 'stage2_complete', { brandData: extractedBrandData });

    // Generate images (from brief image prompts!)
    console.log('🖼️ Generating images...');
    if (onProgress) onProgress('🖼️ Stage 3/5: Generating brand-aligned images from brief...', 'progress');
    const imagePrompts = extractImagePrompts(briefText);
    const generatedImages = await generateImages(imagePrompts);

    // Send images result
    if (onProgress) onProgress('✅ Stage 3 complete: Images generated!', 'stage3_complete', { images: generatedImages });

    // Generate content (Now with colors and images available!)
    console.log('✍️ Generating content from refined brief...');
    if (onProgress) onProgress('✍️ Stage 4/5: Generating content from refined brief...', 'progress');
    const contentResult = await generateContentFromBrief(briefText);

    if (!contentResult.success) {
      return contentResult;
    }

    const contentText = contentResult.contentText;

    // Send content result
    if (onProgress) onProgress('✅ Stage 4 complete: Content generated!', 'stage4_complete', { content: contentText });

    if (dressipiOptions && (dressipiOptions.domain || dressipiOptions.customerName) && dressipiOptions.seedItemId) {
      try {
        if (onProgress) onProgress('🛍️ Fetching similar items from Dressipi...', 'dressipi_fetch');
        dressipiData = await fetchRelatedItems({
          domain: dressipiOptions.domain,
          customerName: dressipiOptions.customerName,
          itemId: dressipiOptions.seedItemId,
          queryOptions: dressipiOptions.queryOptions || {},
        });
        if (onProgress) onProgress('✅ Retrieved Dressipi similar items', 'dressipi_complete', { dressipi: dressipiData });
      } catch (dressipiError) {
        console.error('Dressipi fetch failed:', dressipiError);
        dressipiData = { success: false, error: dressipiError.message };
        if (onProgress) onProgress(`⚠️ Dressipi fetch failed: ${dressipiError.message}`, 'dressipi_error');
      }
    }

    // Generate HTML with brand-aligned styling
    console.log('📱 Generating HTML with brand styling...');
    if (onProgress) onProgress('📱 Stage 5/5: Generating mobile-first HTML with brand styling...', 'progress');
    const htmlResult = await generateEmailHTMLFromText(contentText, enhancedLookAndFeel, generatedImages);

    if (!htmlResult.success) {
      return htmlResult;
    }

    let finalHtml = htmlResult.html;
    if (dressipiData && Array.isArray(dressipiData.garment_data) && dressipiData.garment_data.length > 0) {
      dressipiSectionHtml = buildDressipiHtmlSection({
        seedItem: dressipiData.seed_detail || null,
        items: dressipiData.garment_data,
        lookAndFeel: enhancedLookAndFeel,
      });
      finalHtml = injectDressipiSection(finalHtml, dressipiSectionHtml);
    }

    // Parse basic content fields for frontend display
    const content = parseBasicContent(contentText);

    return {
      success: true,
      content: content,
      html: finalHtml,
      images: generatedImages,
      brief: briefText,
      dressipi: dressipiData,
      dressipiSection: dressipiSectionHtml
    };

  } catch (error) {
    console.error('Campaign generation with answers error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate images using DALL-E 3
 * @param {string} prompt - Description of the image to generate
 * @param {object} options - Generation options (size, quality, style)
 * @returns {Promise<object>} Generated image URL and metadata
 */
async function generateImage(prompt, options = {}) {
  try {
    const {
      size = '1024x1024', // '1024x1024', '1792x1024', '1024x1792'
      quality = 'standard', // 'standard' or 'hd'
      style = 'vivid', // 'vivid' or 'natural'
      n = 1
    } = options;

    console.log('Generating image with DALL-E 3:', prompt);

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: n,
      size: size,
      quality: quality,
      style: style,
    });

    const imageUrl = response.data[0].url;
    const revisedPrompt = response.data[0].revised_prompt;

    console.log('Image generated successfully');

    return {
      success: true,
      imageUrl,
      revisedPrompt,
      originalPrompt: prompt
    };
  } catch (error) {
    console.error('DALL-E API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate multiple images for an email campaign
 * @param {string} emailTheme - Theme/topic of the email
 * @param {number} count - Number of images to generate
 * @returns {Promise<object>} Array of generated images
 */
async function generateCampaignImages(emailTheme, count = 1) {
  try {
    // Generate a more specific prompt for email marketing
    const enhancedPrompt = `Professional email marketing image for ${emailTheme}. Clean, modern design suitable for newsletter. High quality, eye-catching, brand-friendly.`;

    const images = [];
    for (let i = 0; i < count; i++) {
      const result = await generateImage(enhancedPrompt, { quality: 'hd', style: 'vivid' });
      if (result.success) {
        images.push(result);
      }
    }

    return {
      success: true,
      images,
      count: images.length
    };
  } catch (error) {
    console.error('Campaign Image Generation Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  generateEmailContent,
  generateEmailHTML,
  generateEmailCampaign,
  generateCampaignWithAnswers,
  generateImage,
  generateCampaignImages
};
