import { useEffect, useRef, useState } from 'react';

function InteractiveEmailPreview({ html, onRegenerateImage, isGeneratingImage }) {
  const previewRef = useRef(null);
  const [hoveredImageUrl, setHoveredImageUrl] = useState(null);

  useEffect(() => {
    if (!previewRef.current || !html) return;

    // Render HTML in the preview
    previewRef.current.innerHTML = html;

    // Find all images and add hover overlays
    const images = previewRef.current.querySelectorAll('img');

    images.forEach((img) => {
      // Create wrapper for image + overlay
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.display = 'inline-block';
      wrapper.style.width = img.style.width || '100%';

      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = 'image-overlay';
      overlay.style.position = 'absolute';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.right = '0';
      overlay.style.bottom = '0';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
      overlay.style.display = 'none';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.cursor = 'pointer';
      overlay.style.zIndex = '10';

      // Create button
      const button = document.createElement('button');
      button.textContent = '🤖 AI Regenerate';
      button.style.padding = '8px 16px';
      button.style.backgroundColor = '#8b5cf6';
      button.style.color = 'white';
      button.style.border = 'none';
      button.style.borderRadius = '8px';
      button.style.fontSize = '14px';
      button.style.fontWeight = '600';
      button.style.cursor = 'pointer';
      button.style.transition = 'all 0.2s';

      button.onmouseenter = () => {
        button.style.backgroundColor = '#7c3aed';
        button.style.transform = 'scale(1.05)';
      };

      button.onmouseleave = () => {
        button.style.backgroundColor = '#8b5cf6';
        button.style.transform = 'scale(1)';
      };

      button.onclick = (e) => {
        e.stopPropagation();
        const imageUrl = img.src;
        onRegenerateImage(imageUrl);
      };

      overlay.appendChild(button);

      // Wrap image
      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(img);
      wrapper.appendChild(overlay);

      // Show overlay on hover
      wrapper.onmouseenter = () => {
        overlay.style.display = 'flex';
      };

      wrapper.onmouseleave = () => {
        overlay.style.display = 'none';
      };
    });
  }, [html, onRegenerateImage]);

  if (!html) {
    return (
      <div className="p-8 text-center text-gray-400">
        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center text-4xl">
          📧
        </div>
        <p className="font-semibold text-gray-600 mb-2">No Email Generated Yet</p>
        <p className="text-sm text-gray-500">
          Start a conversation to create your email campaign
        </p>
      </div>
    );
  }

  return (
    <div
      ref={previewRef}
      className="email-preview-content"
      style={{
        backgroundColor: 'white',
        color: 'black',
        padding: '0',
        width: '100%',
        minHeight: '600px'
      }}
    />
  );
}

export default InteractiveEmailPreview;
