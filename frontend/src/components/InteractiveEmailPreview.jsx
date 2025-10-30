import { useEffect, useRef } from 'react';

function InteractiveEmailPreview({
  html,
  onRegenerateImage,
  isGeneratingImage,
  isEditable = false,
  onHtmlChange,
}) {
  const previewRef = useRef(null);

  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    // Keep edits intact while typing by avoiding unnecessary resets.
    const nextHtml = html ?? '';
    if (isEditable) {
      container.setAttribute('contenteditable', 'true');
      if (container.innerHTML !== nextHtml) {
        container.innerHTML = nextHtml;
      }
      return;
    }

    container.setAttribute('contenteditable', 'false');

    if (!html) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = nextHtml;

    const images = container.querySelectorAll('img');

    images.forEach((img) => {
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.display = 'inline-block';
      wrapper.style.width = img.style.width || '100%';

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

      const button = document.createElement('button');
      button.textContent = isGeneratingImage ? '⏳ Regenerating...' : '🤖 AI Regenerate';
      button.style.padding = '8px 16px';
      button.style.backgroundColor = '#8b5cf6';
      button.style.color = 'white';
      button.style.border = 'none';
      button.style.borderRadius = '8px';
      button.style.fontSize = '14px';
      button.style.fontWeight = '600';
      button.style.cursor = isGeneratingImage ? 'progress' : 'pointer';
      button.style.transition = 'all 0.2s';
      button.disabled = !!isGeneratingImage;

      if (!isGeneratingImage) {
        button.onmouseenter = () => {
          button.style.backgroundColor = '#7c3aed';
          button.style.transform = 'scale(1.05)';
        };

        button.onmouseleave = () => {
          button.style.backgroundColor = '#8b5cf6';
          button.style.transform = 'scale(1)';
        };
      }

      button.onclick = (e) => {
        e.stopPropagation();
        if (!onRegenerateImage || isGeneratingImage) return;
        const imageUrl = img.src;
        onRegenerateImage(imageUrl);
      };

      overlay.appendChild(button);

      const parent = img.parentNode;
      parent.insertBefore(wrapper, img);
      wrapper.appendChild(img);
      wrapper.appendChild(overlay);

      wrapper.onmouseenter = () => {
        overlay.style.display = 'flex';
      };

      wrapper.onmouseleave = () => {
        overlay.style.display = 'none';
      };
    });
  }, [html, isEditable, isGeneratingImage, onRegenerateImage]);

  useEffect(() => {
    const container = previewRef.current;
    if (!container || !isEditable || typeof onHtmlChange !== 'function') return;

    const handleInput = () => {
      onHtmlChange(container.innerHTML);
    };

    const handleBlur = () => {
      onHtmlChange(container.innerHTML);
    };

    container.addEventListener('input', handleInput);
    container.addEventListener('blur', handleBlur);

    return () => {
      container.removeEventListener('input', handleInput);
      container.removeEventListener('blur', handleBlur);
    };
  }, [isEditable, onHtmlChange]);

  if (!html && !isEditable) {
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
      className={`email-preview-content ${isEditable ? 'outline outline-2 outline-emerald-500/70 shadow-lg shadow-emerald-500/20' : ''}`}
      data-editing={isEditable ? 'true' : 'false'}
      suppressContentEditableWarning
      spellCheck={false}
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
