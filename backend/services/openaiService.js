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
 * Generate HTML email template from content
 */
async function generateEmailHTML(emailContent, lookAndFeel = {}) {
  try {
    const { brandColor = '#6366f1', accentColor = '#ec4899', logoUrl = '', fontFamily = 'Arial, sans-serif' } = lookAndFeel;

    // Load prompt from file
    const prompt = loadPrompt('email_html_generation');
    const { buildUserPrompt } = require('../utils/promptLoader');

    // Build user prompt with variables
    const userPrompt = buildUserPrompt('email_html_generation', {
      subject: emailContent.subject,
      preheader: emailContent.preheader,
      headline: emailContent.headline,
      body: emailContent.body,
      cta: emailContent.cta,
      ctaUrl: emailContent.ctaUrl,
      footer: emailContent.footer,
      brandColor,
      accentColor,
      fontFamily,
      logoUrl
    });

    const completion = await openai.chat.completions.create({
      model: prompt.settings.model || "gpt-4o",
      messages: [
        { role: "system", content: prompt.systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: prompt.settings.temperature || 0.5,
    });

    const html = completion.choices[0].message.content;
    return { success: true, html };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate complete email campaign (content + HTML)
 */
async function generateEmailCampaign(userPrompt, lookAndFeel = {}) {
  try {
    // Step 1: Generate email content
    const contentResult = await generateEmailContent(userPrompt, lookAndFeel);
    if (!contentResult.success) {
      return contentResult;
    }

    // Step 2: Generate HTML from content
    const htmlResult = await generateEmailHTML(contentResult.content, lookAndFeel);
    if (!htmlResult.success) {
      return htmlResult;
    }

    return {
      success: true,
      content: contentResult.content,
      html: htmlResult.html
    };
  } catch (error) {
    console.error('Email Generation Error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  generateEmailContent,
  generateEmailHTML,
  generateEmailCampaign
};
