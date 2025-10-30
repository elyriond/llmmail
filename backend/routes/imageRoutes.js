const express = require('express');
const router = express.Router();
const { generateImage, generateCampaignImages } = require('../services/openaiService');

// Generate single image
router.post('/generate-image', async (req, res) => {
  try {
    const { prompt, size, quality, style } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    console.log('Generating image:', prompt);

    const result = await generateImage(prompt, { size, quality, style });

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate campaign images
router.post('/generate-campaign-images', async (req, res) => {
  try {
    const { theme, count } = req.body;

    if (!theme) {
      return res.status(400).json({
        success: false,
        error: 'Theme is required'
      });
    }

    console.log('Generating campaign images for theme:', theme);

    const result = await generateCampaignImages(theme, count || 1);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Campaign image generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
