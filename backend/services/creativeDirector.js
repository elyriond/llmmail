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

    if (companySettings && companySettings.corporate_identity) {
      const identity = companySettings.corporate_identity;
      const toneOfVoice = companySettings.tone_of_voice || {};

      contextMessage += `Company Profile:\n`;
      contextMessage += `- Company: ${identity.companyName || 'Not specified'}\n`;
      contextMessage += `- Brand Colors: Primary ${identity.brandColors?.primary || 'N/A'}, Secondary ${identity.brandColors?.secondary || 'N/A'}\n`;
      contextMessage += `- Typography: ${identity.typography?.primaryFont || 'Not specified'}\n`;
      contextMessage += `- Tagline: ${identity.tagline || 'Not specified'}\n`;
      contextMessage += `- Tone of Voice: ${toneOfVoice.style || 'Not specified'}\n`;
      contextMessage += `- Language: ${toneOfVoice.language || 'Not specified'}\n`;

      if (toneOfVoice.imageStyle) {
        contextMessage += `- Visual Style: ${toneOfVoice.imageStyle}\n`;
      }
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

    const contentPrompt = `You are an expert email copywriter. Based on the following campaign brief, create the email content.

CAMPAIGN BRIEF:
${briefText}

Generate the email content with clear sections for: Subject Line, Preheader, Headline, Body Copy, Call-to-Action, and Footer.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert email copywriter. Generate compelling, conversion-focused email content.'
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
