// LinkeBlock Popup
console.log('🎭 LinkeBlock popup loading...');

document.addEventListener('DOMContentLoaded', async () => {
  const statusElement = document.getElementById('status');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const statusDetails = document.getElementById('statusDetails');
  const testButton = document.getElementById('testButton');
  const optionsButton = document.getElementById('optionsButton');
  const refreshButton = document.getElementById('refreshButton');

  // Check if we're on LinkedIn
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isLinkedIn = tab.url && tab.url.includes('linkedin.com');

  if (!isLinkedIn) {
    updateStatus('inactive', 'Not on LinkedIn', 'Navigate to LinkedIn to use this extension');
    return;
  }

  // Check API key
  let hasApiKey = false;
  try {
    const result = await chrome.storage.local.get(['openai_api_key']);
    hasApiKey = !!(result.openai_api_key && result.openai_api_key.length > 0);
  } catch (error) {
    console.error('Failed to check API key:', error);
  }

  if (!hasApiKey) {
    updateStatus('inactive', 'No API Key', 'Click Options to configure your OpenAI API key');
    return;
  }

  // Check if content script is working
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'ping' });
    if (response && response.pong) {
      updateStatus('active', 'Extension Active', 'AI-powered post analysis is running');
    } else {
      updateStatus('inactive', 'Extension Inactive', 'Content script not responding. Try refreshing the page.');
    }
  } catch (error) {
    updateStatus('inactive', 'Extension Inactive', 'Content script not loaded. Try refreshing the page.');
  }

  function updateStatus(state, title, details) {
    statusElement.className = `status ${state}`;
    statusDot.className = `status-dot ${state}`;
    statusText.textContent = title;
    statusDetails.textContent = details;
  }

  // Test button
  testButton.addEventListener('click', async () => {
    testButton.disabled = true;
    testButton.textContent = '🔄 Testing...';
    
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'test' });
      if (response && response.success) {
        updateStatus('active', 'Test Successful', response.message || 'Extension is working correctly');
      } else {
        updateStatus('inactive', 'Test Failed', response.error || 'Extension test failed');
      }
    } catch (error) {
      updateStatus('inactive', 'Test Failed', 'Could not communicate with content script');
    } finally {
      testButton.disabled = false;
      testButton.textContent = '🧪 Test Extension';
    }
  });

  // Options button
  optionsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Refresh button
  refreshButton.addEventListener('click', () => {
    chrome.tabs.reload(tab.id);
    window.close();
  });

  console.log('✅ Popup initialized');
}); 