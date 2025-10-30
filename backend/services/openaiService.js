const OpenAI = require('openai');
const { loadPrompt } = require('../utils/promptLoader');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate email content using OpenAI GPT-4
 */
async function generateEmailContent(userPrompt, lookAndFeel = {}) {
  try {
    // Load prompt from file
    const prompt = loadPrompt('email_content_generation');

    const completion = await openai.chat.completions.create({
      model: prompt.settings.model || "gpt-4o",
      messages: [
        { role: "system", content: prompt.systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: prompt.settings.responseFormat || { type: "json_object" },
      temperature: prompt.settings.temperature || 0.7,
    });

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
    const { brandColor = '#6366f1', accentColor = '#ec4899', logoUrl = '', fontFamily = 'Arial, sans-serif' } = lookAndFeel;

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

Styling:
- Brand Color: ${brandColor}
- Accent Color: ${accentColor}
- Font: ${fontFamily}
- Logo URL: ${logoUrl || 'none'}

Create a responsive, mobile-first HTML email using Mapp Engage syntax for personalization (e.g., <%\${user['FirstName']}%>).`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 'You are an expert Mapp Engage email template developer. Create responsive, mobile-first HTML email templates with proper Mapp syntax.'
        },
        { role: "user", content: htmlPrompt }
      ],
      temperature: 0.5,
    });

    const html = completion.choices[0].message.content;
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
 * @returns {Promise<object>} Complete campaign or clarifying questions
 */
async function generateEmailCampaign(userPrompt, lookAndFeel = {}, companySettings = null) {
  try {
    const { analyzeAndEnhancePrompt, generateContentFromBrief } = require('./creativeDirector');

    // STAGE 1: Creative Director Analysis
    console.log('🎨 Stage 1: Creative Director analyzing request...');
    const directorResult = await analyzeAndEnhancePrompt(userPrompt, companySettings);

    if (!directorResult.success) {
      return directorResult;
    }

    const briefText = directorResult.briefText;

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

    // STAGE 2: Generate Content from Brief
    console.log('✍️ Stage 2: Generating content from expert brief...');
    const contentResult = await generateContentFromBrief(briefText);

    if (!contentResult.success) {
      return contentResult;
    }

    const contentText = contentResult.contentText;

    // STAGE 3: Extract and generate images from brief
    console.log('🖼️ Stage 3: Generating images from creative brief...');
    const imagePrompts = extractImagePrompts(briefText);
    const generatedImages = await generateImages(imagePrompts);

    // STAGE 4: Generate Mobile-First HTML
    console.log('📱 Stage 4: Generating mobile-first HTML template...');
    const htmlResult = await generateEmailHTMLFromText(contentText, lookAndFeel, generatedImages);

    if (!htmlResult.success) {
      return htmlResult;
    }

    console.log('✅ Campaign generation complete!');

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
    console.error('Email Generation Error:', error);
    return { success: false, error: error.message };
  }
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

/**
 * Generate campaign after user answers clarifying questions
 * @param {string} originalBriefText - Original brief text from Creative Director
 * @param {object} userAnswers - User's answers to questions
 * @param {object} lookAndFeel - Brand styling
 * @returns {Promise<object>} Complete campaign
 */
async function generateCampaignWithAnswers(originalBriefText, userAnswers, lookAndFeel = {}) {
  try {
    const { refineBrief, generateContentFromBrief } = require('./creativeDirector');

    // Refine brief with user answers
    console.log('🔄 Refining brief with user feedback...');
    const refinedResult = await refineBrief(originalBriefText, userAnswers);

    if (!refinedResult.success) {
      return refinedResult;
    }

    const briefText = refinedResult.briefText;

    // Generate content
    console.log('✍️ Generating content from refined brief...');
    const contentResult = await generateContentFromBrief(briefText);

    if (!contentResult.success) {
      return contentResult;
    }

    const contentText = contentResult.contentText;

    // Generate images
    console.log('🖼️ Generating images...');
    const imagePrompts = extractImagePrompts(briefText);
    const generatedImages = await generateImages(imagePrompts);

    // Generate HTML
    console.log('📱 Generating HTML...');
    const htmlResult = await generateEmailHTMLFromText(contentText, lookAndFeel, generatedImages);

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
