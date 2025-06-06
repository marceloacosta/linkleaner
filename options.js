// options.js - Handle LinkExploder options page functionality

document.addEventListener('DOMContentLoaded', loadOptions);

// Load saved options
function loadOptions() {
  chrome.storage.sync.get({
    oaiKey: '',
    debugMode: true,
    minPostLength: 30,
    maxConcurrentClassifications: 3
  }, (items) => {
    document.getElementById('apiKey').value = items.oaiKey;
    document.getElementById('debugMode').checked = items.debugMode;
    document.getElementById('minPostLength').value = items.minPostLength;
    document.getElementById('maxConcurrent').value = items.maxConcurrentClassifications;
  });
}

// Save options
function saveOptions() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const debugMode = document.getElementById('debugMode').checked;
  const minPostLength = parseInt(document.getElementById('minPostLength').value);
  const maxConcurrent = parseInt(document.getElementById('maxConcurrent').value);

  // Validate API key format
  if (apiKey && !apiKey.startsWith('sk-')) {
    showStatus('Invalid API key format. Must start with "sk-"', 'error');
    return;
  }

  // Validate numeric inputs
  if (isNaN(minPostLength) || minPostLength < 10 || minPostLength > 500) {
    showStatus('Minimum post length must be between 10 and 500 characters', 'error');
    return;
  }

  if (isNaN(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 10) {
    showStatus('Max concurrent classifications must be between 1 and 10', 'error');
    return;
  }

  chrome.storage.sync.set({
    oaiKey: apiKey,
    debugMode: debugMode,
    minPostLength: minPostLength,
    maxConcurrentClassifications: maxConcurrent
  }, () => {
    showStatus('Settings saved successfully! Please refresh LinkedIn to apply changes.', 'success');
    
    // Notify background script of API key change
    if (apiKey) {
      chrome.runtime.sendMessage({
        type: 'updateApiKey',
        apiKey: apiKey
      });
    }
  });
}

// Test API connection
async function testConnection() {
  const apiKey = document.getElementById('apiKey').value.trim();
  
  if (!apiKey) {
    showStatus('Please enter an API key first', 'error');
    return;
  }

  if (!apiKey.startsWith('sk-')) {
    showStatus('Invalid API key format. Must start with "sk-"', 'error');
    return;
  }

  showStatus('Testing API connection...', 'info');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo-0125',
        temperature: 0,
        max_tokens: 2,
        messages: [
          { 
            role: 'system',
            content: 'Return ONE WORD: hype, cringe, motivational, other.'
          },
          { 
            role: 'user', 
            content: 'This is a test post to verify the API connection.'
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
    }

    const data = await response.json();
    const classification = data.choices?.[0]?.message?.content.trim().toLowerCase() || 'unknown';
    
    showStatus(`✅ API connection successful! Test classification: "${classification}"`, 'success');
  } catch (error) {
    console.error('API test failed:', error);
    
    if (error.message.includes('401')) {
      showStatus('❌ Invalid API key. Please check your key and try again.', 'error');
    } else if (error.message.includes('429')) {
      showStatus('❌ Rate limit exceeded. Please wait and try again.', 'error');
    } else if (error.message.includes('quota')) {
      showStatus('❌ API quota exceeded. Please check your OpenAI billing.', 'error');
    } else {
      showStatus(`❌ API test failed: ${error.message}`, 'error');
    }
  }
}

// Toggle API key visibility
function toggleVisibility() {
  const apiKeyInput = document.getElementById('apiKey');
  const currentType = apiKeyInput.type;
  apiKeyInput.type = currentType === 'password' ? 'text' : 'password';
}

// Show status message
function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  
  // Auto-hide after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = '';
    }, 5000);
  }
}

// Global functions for HTML onclick handlers
window.saveOptions = saveOptions;
window.testConnection = testConnection;
window.toggleVisibility = toggleVisibility; 