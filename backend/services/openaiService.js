const OpenAI = require('openai');
const { loadPrompt } = require('../utils/promptLoader');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
    console.log('--- generateEmailContent Prompts ---');
    console.log('System Prompt:', prompt.systemPrompt);
    console.log('User Prompt:', userPrompt);
    console.log('-------------------------------------');

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
      imagesInfo = '\n\nUse the following images in the email:\n';
      generatedImages.forEach((img, idx) => {
        // Use a simple placeholder instead of the full data URI
        imagesInfo += `Image ${idx + 1}: Use placeholder "[IMAGE_${idx + 1}]". Description: ${img.prompt}\n\n`;
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

    console.log('--- generateEmailHTMLFromText Prompts ---');
    console.log('System Prompt:', 'You are an expert Mapp Engage email template developer. Create responsive, mobile-first HTML email templates with proper Mapp syntax.');
    console.log('User Prompt (HTML):', htmlPrompt);
    console.log('-----------------------------------------');

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
async function generateEmailCampaign(userPrompt, lookAndFeel = {}, companySettings = null, onProgress = null) {
  try {
    const { analyzeAndEnhancePrompt, generateContentFromBrief } = require('./creativeDirector');

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
    const imagePrompts = extractImagePrompts(briefText);
    const generatedImages = [];
    for (const prompt of imagePrompts) {
      const result = await generateImage(prompt);
      if (result.success) {
        generatedImages.push({
          url: result.imageUrl,
          prompt: prompt,
          revisedPrompt: result.revisedPrompt
        });
        if (onProgress) onProgress(result.imageUrl, 'image_generated'); // Send image URL to frontend
      } else {
        console.error('Failed to generate image for prompt:', prompt, result.error);
        if (onProgress) onProgress(`❌ Failed to generate image for: ${prompt}. Error: ${result.error}`, 'error');
      }
    }

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

    // STAGE 5: Generate Mobile-First HTML with brand-aligned styling
    console.log('📱 Stage 5: Generating mobile-first HTML template with brand styling...');
    if (onProgress) onProgress('📱 Stage 5/5: Generating mobile-first HTML with brand styling...', 'progress');
    const htmlResult = await generateEmailHTMLFromText(contentText, enhancedLookAndFeel, generatedImages);

    if (!htmlResult.success) {
      return htmlResult;
    }

    // FINAL STEP: Inject image data URIs into the HTML
    let finalHtml = htmlResult.html;
    generatedImages.forEach((img, idx) => {
      const placeholder = `[IMAGE_${idx + 1}]`;
      finalHtml = finalHtml.replace(new RegExp(placeholder, 'g'), img.url);
    });

    console.log('✅ Campaign generation complete!');

    // Parse basic content fields for frontend display
    const content = parseBasicContent(contentText);

    return {
      success: true,
      content: content,
      html: finalHtml, // Send the HTML with embedded images
      images: generatedImages,
      brief: briefText
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
  const brandVoiceMatch = briefText.match(/(?:Tone|Brand Voice):\s*([^\n]+)/i);
  if (brandVoiceMatch) brandData.brandVoice = brandVoiceMatch[1].trim();

  console.log('🎨 Extracted brand alignment:', brandData);

  return brandData;
}

/**
 * Extract image prompts from brief text using the new delimiter-based format.
 */
function extractImagePrompts(briefText) {
  const prompts = [];
  const imageMatches = briefText.matchAll(/---IMAGE_PROMPT_START---([\s\S]*?)---IMAGE_PROMPT_END---/g);

  for (const match of imageMatches) {
    if (match[1]) {
      const cleanedPrompt = match[1].trim();
      if (cleanedPrompt) {
        prompts.push(cleanedPrompt);
        console.log('✅ Extracted image prompt:', cleanedPrompt);
      }
    }
  }

  // Default to 1 generic prompt if none found
  if (prompts.length === 0) {
    console.warn('⚠️ No specific image prompts found in brief. Falling back to generic prompt.');
    prompts.push('Professional email marketing photography, high quality, brand-aligned aesthetic, clean composition');
  } else {
    console.log(`✅ Found ${prompts.length} specific image prompts in brief.`);
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

/**
 * Generate campaign after user answers clarifying questions
 * @param {string} originalBriefText - Original brief text from Creative Director
 * @param {object} userAnswers - User's answers to questions
 * @param {object} lookAndFeel - Brand styling
 * @param {function} onProgress - Optional callback for progress updates
 * @returns {Promise<object>} Complete campaign
 */
async function generateCampaignWithAnswers(originalBriefText, userAnswers, lookAndFeel = {}, onProgress = null) {
  try {
    const { refineBrief, generateContentFromBrief } = require('./creativeDirector');

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

    // Generate HTML with brand-aligned styling
    console.log('📱 Generating HTML with brand styling...');
    if (onProgress) onProgress('📱 Stage 5/5: Generating mobile-first HTML with brand styling...', 'progress');
    const htmlResult = await generateEmailHTMLFromText(contentText, enhancedLookAndFeel, generatedImages);

    if (!htmlResult.success) {
      return htmlResult;
    }

    // Parse basic content fields for frontend display
    const content = parseBasicContent(contentText);

    return {
      success: true,
      content: content,
      html: htmlResult.html,
      images: generatedImages,
      brief: briefText
    };

  } catch (error) {
    console.error('Campaign generation with answers error:', error);
    return { success: false, error: error.message };
  }
}

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate images using Gemini
 * @param {string} prompt - Description of the image to generate
 * @returns {Promise<object>} Generated image URL and metadata
 */
async function generateImageWithGemini(prompt) {
  try {
    console.log('--- Starting Gemini Image Generation ---');
    console.log('PROMPT:', prompt);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No candidates returned from Gemini API.');
    }

    const candidate = response.candidates[0];
    if (candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
        throw new Error(`Image generation stopped for reason: ${candidate.finishReason}`);
    }

    const imagePart = candidate.content.parts.find(part => part.inlineData && part.inlineData.data);

    if (!imagePart) {
      console.error('Full Gemini API Response:', JSON.stringify(response, null, 2));
      throw new Error('No inline image data found in the Gemini API response.');
    }

    const { mimeType, data } = imagePart.inlineData;
    
    // Save the image to a file instead of creating a data URI
    const imageBuffer = Buffer.from(data, 'base64');
    const fileExtension = mimeType.split('/')[1] || 'png';
    const uniqueFilename = `${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;
    const imagePath = path.join(__dirname, '..', 'temp', 'images', uniqueFilename);
    
    await fs.promises.writeFile(imagePath, imageBuffer);

    const imageUrl = `/temp/images/${uniqueFilename}`; // Return a local URL path
    console.log(`Image generated and saved to: ${imagePath}`);

    return {
      success: true,
      imageUrl, // This is now a local URL path
      revisedPrompt: prompt,
      originalPrompt: prompt
    };
  } catch (error) {
    console.error('--- Gemini API Call Failed ---');
    console.error(error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate images using the selected service (now Gemini)
 * @param {string} prompt - Description of the image to generate
 * @returns {Promise<object>} Generated image URL and metadata
 */
async function generateImage(prompt) {
  return generateImageWithGemini(prompt);
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

    console.log('--- generateCampaignImages Prompt ---');
    console.log('Enhanced Prompt:', enhancedPrompt);
    console.log('-------------------------------------');

    const images = [];
    for (let i = 0; i < count; i++) {
      const result = await generateImage(enhancedPrompt);
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
