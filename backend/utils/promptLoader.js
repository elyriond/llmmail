const fs = require('fs');
const path = require('path');

/**
 * Load and parse prompt from markdown file
 * @param {string} promptName - Name of the prompt file (without .md extension)
 * @returns {object} Parsed prompt with systemPrompt and settings
 */
function loadPrompt(promptName) {
  const promptPath = path.join(__dirname, '../../prompts', `${promptName}.md`);

  if (!fs.existsSync(promptPath)) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }

  const content = fs.readFileSync(promptPath, 'utf-8');

  // Extract system prompt (between ## System Prompt and next ##)
  const systemPromptMatch = content.match(/## System Prompt\s+([\s\S]*?)(?=\n##|$)/);
  const systemPrompt = systemPromptMatch ? systemPromptMatch[1].trim() : '';

  // Remove code blocks if present
  const cleanedSystemPrompt = systemPrompt
    .replace(/```json\n/g, '')
    .replace(/```\n/g, '')
    .replace(/\n```/g, '');

  // Extract settings (temperature, model, etc.)
  const settingsMatch = content.match(/## Settings\s+([\s\S]*?)(?=\n##|$)/);
  const settings = {};

  if (settingsMatch) {
    const settingsText = settingsMatch[1];

    // Extract model
    const modelMatch = settingsText.match(/Model:\s*(\S+)/);
    if (modelMatch) settings.model = modelMatch[1];

    // Extract temperature
    const tempMatch = settingsText.match(/Temperature:\s*([\d.]+)/);
    if (tempMatch) settings.temperature = parseFloat(tempMatch[1]);

    // Extract response format
    const formatMatch = settingsText.match(/Response Format:\s*(\S+)/i);
    if (formatMatch && formatMatch[1].toLowerCase() === 'json') {
      settings.responseFormat = { type: 'json_object' };
    }
  }

  return {
    systemPrompt: cleanedSystemPrompt,
    settings
  };
}

/**
 * Build user prompt by replacing template variables
 * @param {string} promptName - Name of the prompt file
 * @param {object} variables - Variables to replace in the template
 * @returns {string} Compiled user prompt
 */
function buildUserPrompt(promptName, variables) {
  const promptPath = path.join(__dirname, '../../prompts', `${promptName}.md`);

  if (!fs.existsSync(promptPath)) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }

  const content = fs.readFileSync(promptPath, 'utf-8');

  // Extract user prompt template
  const userPromptMatch = content.match(/## User Prompt Template\s+([\s\S]*?)(?=\n##|$)/);
  let userPrompt = userPromptMatch ? userPromptMatch[1].trim() : '';

  // Replace {{variable}} placeholders
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    userPrompt = userPrompt.replace(regex, value || '');
  }

  // Handle conditional blocks {{#if var}}...{{/if}}
  userPrompt = userPrompt.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/g, (match, varName, content) => {
    return variables[varName] ? content : '';
  });

  return userPrompt.trim();
}

module.exports = {
  loadPrompt,
  buildUserPrompt
};
