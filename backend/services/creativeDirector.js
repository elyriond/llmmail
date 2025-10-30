const OpenAI = require('openai');
const { loadPrompt } = require('../utils/promptLoader');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Creative Director - Analyzes user input and creates comprehensive campaign brief
 * @param {string} userPrompt - User's request for email campaign
 * @param {object} companySettings - Company profile from settings
 * @returns {Promise<object>} Campaign brief as natural language text
 */
async function analyzeAndEnhancePrompt(userPrompt, companySettings = null) {
  try {
    console.log('🎨 Creative Director analyzing request...');

    // Load Creative Director prompt
    const prompt = loadPrompt('creative_director');

    // Build context with company settings
    let contextMessage = `User Request: "${userPrompt}"\n\n`;

    // Use the full markdown brand analysis if available
    if (companySettings && companySettings.full_scan_markdown) {
      contextMessage += `=== BRAND PROFILE & STYLE GUIDE ===\n`;
      contextMessage += `${companySettings.full_scan_markdown}\n`;
      contextMessage += `=== END BRAND PROFILE ===\n\n`;

      if (companySettings.website_url) {
        contextMessage += `Brand Website: ${companySettings.website_url}\n\n`;
      }

      contextMessage += `IMPORTANT: Use the brand information above to ensure the campaign aligns with the brand's colors, typography, tone of voice, and visual style.\n`;
    } else {
      contextMessage += `\n⚠️ Company settings are not configured. User needs to set up their profile first.\n`;
    }

    // Call GPT-4o Creative Director
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user', content: contextMessage }
      ],
      temperature: 0.8,
    });

    const briefText = completion.choices[0].message.content;

    console.log('✅ Creative Director analysis complete');
    console.log('Brief preview:', briefText.substring(0, 200) + '...');

    // Just return the text - no parsing needed!
    return {
      success: true,
      briefText: briefText
    };

  } catch (error) {
    console.error('Creative Director Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Refine brief based on user's answers to clarifying questions
 * @param {string} originalBriefText - Original brief text from Creative Director
 * @param {object} userAnswers - User's answers to questions
 * @returns {Promise<object>} Refined campaign brief as text
 */
async function refineBrief(originalBriefText, userAnswers) {
  try {
    console.log('🔄 Refining brief with user feedback...');

    const refinementPrompt = `Original Brief:
${originalBriefText}

User's Answers to Clarifying Questions:
${JSON.stringify(userAnswers, null, 2)}

Based on the user's answers, refine and enhance the original brief. Make it more specific and targeted.`;

    const prompt = loadPrompt('creative_director');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user', content: refinementPrompt }
      ],
      temperature: 0.8,
    });

    const refinedBriefText = completion.choices[0].message.content;

    console.log('✅ Brief refined successfully');

    return {
      success: true,
      briefText: refinedBriefText
    };

  } catch (error) {
    console.error('Brief Refinement Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate enhanced content based on Creative Director's brief
 * @param {string} briefText - Campaign brief text from Creative Director
 * @returns {Promise<object>} Email content as text
 */
async function generateContentFromBrief(briefText) {
  try {
    console.log('✍️ Generating content from brief...');

    // Load the enhanced email content generation prompt
    const prompt = loadPrompt('email_content_generation');

    const contentPrompt = `Based on the following detailed campaign brief from the Creative Director, create the email content.

CAMPAIGN BRIEF FROM CREATIVE DIRECTOR:
${briefText}

IMPORTANT:
- Follow ALL guidance in the campaign brief including tone, brand voice, personalization strategy, and content structure
- Use the brand keywords and personality traits mentioned in the brief
- Match the specified tone exactly (e.g., if "sophisticated yet accessible", write accordingly)
- Implement the personalization strategy outlined in the brief
- Follow the content structure recommended (hero-cta, story-based, product-showcase, etc.)
- Use the suggested subject line approach and preheader strategy

Generate the email content with clear sections for: Subject Line, Preheader, Headline, Body Copy, Call-to-Action, and Footer.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: prompt.systemPrompt // Use the enhanced prompt with brand voice instructions
        },
        { role: 'user', content: contentPrompt }
      ],
      temperature: 0.7,
    });

    const contentText = completion.choices[0].message.content;

    console.log('✅ Content generated from brief');

    return {
      success: true,
      contentText: contentText
    };

  } catch (error) {
    console.error('Content Generation Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  analyzeAndEnhancePrompt,
  refineBrief,
  generateContentFromBrief
};
