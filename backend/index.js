require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const { generateEmailCampaign } = require('./services/openaiService');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'LLM-Mail Backend API', status: 'running' });
});

// Generate email campaign endpoint
app.post('/api/generate-email', async (req, res) => {
  try {
    const { prompt, lookAndFeel } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    console.log('Generating email for prompt:', prompt);

    const result = await generateEmailCampaign(prompt, lookAndFeel);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test OpenAI connection
app.get('/api/test', (req, res) => {
  const hasApiKey = !!process.env.OPENAI_API_KEY;
  res.json({
    openaiConfigured: hasApiKey,
    apiKeyPrefix: hasApiKey ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'Not set'
  });
});

// Template endpoints
const { templateService, lookFeelService } = require('./services/database');

// Save template
app.post('/api/templates', (req, res) => {
  try {
    const { name, description, subject, preheader, html, userPrompt, lookAndFeel } = req.body;

    if (!name || !html) {
      return res.status(400).json({
        success: false,
        error: 'Name and HTML content are required'
      });
    }

    const templateId = templateService.create({
      name,
      description,
      subject,
      preheader,
      html,
      userPrompt,
      lookAndFeel
    });

    res.json({
      success: true,
      templateId,
      message: 'Template saved successfully'
    });
  } catch (error) {
    console.error('Template save error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all templates
app.get('/api/templates', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const templates = templateService.getAll(limit, offset);

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Template fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get template by ID
app.get('/api/templates/:id', (req, res) => {
  try {
    const template = templateService.getById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Template fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update template
app.put('/api/templates/:id', (req, res) => {
  try {
    const { name, description, subject, html, lookAndFeel } = req.body;

    templateService.update(req.params.id, {
      name,
      description,
      subject,
      html,
      lookAndFeel
    });

    res.json({
      success: true,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Template update error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete template
app.delete('/api/templates/:id', (req, res) => {
  try {
    templateService.delete(req.params.id);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Template delete error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Look & Feel template endpoints

// Get all Look & Feel templates
app.get('/api/look-feel', (req, res) => {
  try {
    const templates = lookFeelService.getAll();
    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Look & Feel fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Save Look & Feel template
app.post('/api/look-feel', (req, res) => {
  try {
    const { name, brandColor, accentColor, logoUrl, fontFamily } = req.body;

    if (!name || !brandColor || !accentColor) {
      return res.status(400).json({
        success: false,
        error: 'Name, brand color, and accent color are required'
      });
    }

    const templateId = lookFeelService.create({
      name,
      brandColor,
      accentColor,
      logoUrl,
      fontFamily
    });

    res.json({
      success: true,
      templateId,
      message: 'Look & Feel template saved successfully'
    });
  } catch (error) {
    console.error('Look & Feel save error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
  console.log(`OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Missing'}`);
});
