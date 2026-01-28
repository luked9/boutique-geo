(function() {
  'use strict';

  const sessionId = window.SESSION_ID;
  const reviewDestinationUrl = window.REVIEW_DESTINATION_URL;

  const elements = {
    copyBtn: document.getElementById('copy-btn'),
    platformBtn: document.getElementById('platform-btn'),
    doneBtn: document.getElementById('done-btn'),
    errorMessage: document.getElementById('error-message'),
    mainContent: document.getElementById('main-content'),
    thankYou: document.getElementById('thank-you')
  };

  // Store original button HTML
  const originalButtonHTML = {
    copy: elements.copyBtn ? elements.copyBtn.innerHTML : '',
    platform: elements.platformBtn ? elements.platformBtn.innerHTML : '',
    done: elements.doneBtn ? elements.doneBtn.innerHTML : ''
  };

  function showError(message) {
    if (elements.errorMessage) {
      elements.errorMessage.textContent = message;
      elements.errorMessage.classList.add('show');
      setTimeout(() => {
        elements.errorMessage.classList.remove('show');
      }, 5000);
    }
  }

  function setButtonState(button, state, buttonType) {
    if (!button) return;

    const checkIcon = `<svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;

    switch(state) {
      case 'loading':
        button.disabled = true;
        button.innerHTML = 'Please wait...';
        break;
      case 'success':
        button.disabled = false;
        button.classList.add('btn-success');
        if (buttonType === 'copy') {
          button.innerHTML = checkIcon + ' Copied!';
        } else if (buttonType === 'platform') {
          button.innerHTML = checkIcon + ' Opening...';
        } else {
          button.innerHTML = checkIcon + ' Done!';
        }
        setTimeout(() => {
          button.innerHTML = originalButtonHTML[buttonType];
          button.classList.remove('btn-success');
        }, 2000);
        break;
      case 'error':
        button.disabled = false;
        button.innerHTML = originalButtonHTML[buttonType];
        break;
      default:
        button.disabled = false;
    }
  }

  async function makeApiCall(endpoint, errorMsg) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      // Don't show error for tracking calls - they're non-critical
      if (errorMsg) {
        console.warn(errorMsg);
      }
      throw error;
    }
  }

  async function handleCopyClick() {
    const reviewText = document.getElementById('review-text');
    if (!reviewText) {
      showError('Review text not found');
      return;
    }

    setButtonState(elements.copyBtn, 'loading', 'copy');

    try {
      await navigator.clipboard.writeText(reviewText.textContent);
      setButtonState(elements.copyBtn, 'success', 'copy');

      // Track copy action (non-critical)
      if (sessionId) {
        makeApiCall(`/api/v1/review/${sessionId}/copied`).catch(() => {});
      }
    } catch (error) {
      setButtonState(elements.copyBtn, 'error', 'copy');

      if (error.name === 'NotAllowedError') {
        showError('Please allow clipboard access and try again');
      } else {
        // Fallback: select text for manual copy
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(reviewText);
        selection.removeAllRanges();
        selection.addRange(range);
        showError('Press and hold to copy the selected text');
      }
    }
  }

  async function handlePlatformClick() {
    if (!reviewDestinationUrl) {
      showError('Review destination not configured');
      return;
    }

    // Track platform click (non-critical)
    if (sessionId) {
      makeApiCall(`/api/v1/review/${sessionId}/platform_clicked`).catch(() => {});
    }

    // Navigate directly - window.open in setTimeout gets blocked on mobile
    window.location.href = reviewDestinationUrl;
  }

  async function handleDoneClick() {
    setButtonState(elements.doneBtn, 'loading', 'done');

    // Track done action (non-critical)
    if (sessionId) {
      makeApiCall(`/api/v1/review/${sessionId}/done`).catch(() => {});
    }

    setButtonState(elements.doneBtn, 'success', 'done');

    setTimeout(() => {
      if (elements.mainContent) {
        elements.mainContent.classList.add('hide');
      }
      if (elements.thankYou) {
        elements.thankYou.classList.add('show');
      }
    }, 500);
  }

  function init() {
    if (elements.copyBtn) {
      elements.copyBtn.addEventListener('click', handleCopyClick);
    }

    if (elements.platformBtn) {
      elements.platformBtn.addEventListener('click', handlePlatformClick);
    }

    if (elements.doneBtn) {
      elements.doneBtn.addEventListener('click', handleDoneClick);
    }

    // Check clipboard support
    if (!navigator.clipboard) {
      console.warn('Clipboard API not available - will use fallback');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
