// options.js - Handle Likleaner options page functionality

console.log('🔧 LinkeBlock options.js loading...');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📄 Options page DOM loaded');
  
  const apiKeyInput = document.getElementById('apiKey');
  const optionsForm = document.getElementById('optionsForm');
  const testButton = document.getElementById('testButton');
  const status = document.getElementById('status');

  // Load existing API key
  try {
    const result = await chrome.storage.local.get(['openai_api_key']);
    if (result.openai_api_key) {
      apiKeyInput.value = result.openai_api_key;
      console.log('✅ Loaded existing API key (length:', result.openai_api_key.length, ')');
    }
  } catch (error) {
    console.error('❌ Failed to load API key:', error);
  }

  // Show status message
  function showStatus(message, type = 'success') {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    
    // Hide after 5 seconds for success messages
    if (type === 'success') {
      setTimeout(() => {
        status.style.display = 'none';
      }, 5000);
    }
  }

  // Save API key
  optionsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }
    
    if (!apiKey.startsWith('sk-')) {
      showStatus('API key should start with "sk-"', 'error');
      return;
    }
    
    try {
      await chrome.storage.local.set({ openai_api_key: apiKey });
      console.log('✅ API key saved successfully');
      showStatus('✅ API key saved successfully!', 'success');
      
      // Notify service worker to reload the key
      try {
        await chrome.runtime.sendMessage({ type: 'reloadApiKey' });
      } catch (error) {
        console.log('Note: Service worker will pick up new key on next reload');
      }
      
    } catch (error) {
      console.error('❌ Failed to save API key:', error);
      showStatus('Failed to save API key: ' + error.message, 'error');
    }
  });

  // Test API key
  testButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('Please enter an API key first', 'error');
      return;
    }
    
    testButton.disabled = true;
    testButton.textContent = 'Testing...';
    showStatus('Testing API key...', 'info');
    
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API key test successful:', data);
        showStatus('✅ API key is valid and working!', 'success');
        
        // Save the key if the test passes
        await chrome.storage.local.set({ openai_api_key: apiKey });
        
      } else {
        const errorText = await response.text();
        console.error('❌ API key test failed:', response.status, errorText);
        
        if (response.status === 401) {
          showStatus('❌ Invalid API key. Please check your key.', 'error');
        } else if (response.status === 429) {
          showStatus('❌ Rate limited. Your key works but you\'ve hit limits.', 'error');
        } else {
          showStatus(`❌ API error: ${response.status}`, 'error');
        }
      }
      
    } catch (error) {
      console.error('❌ API key test error:', error);
      showStatus('❌ Test failed: ' + error.message, 'error');
    } finally {
      testButton.disabled = false;
      testButton.textContent = 'Test API Key';
    }
  });

  console.log('✅ Options page initialized');
});

// Set up all event listeners
function setupEventListeners() {
  console.log('Likleaner: Setting up event listeners...');
  
  // Save button
  const saveButton = document.getElementById('saveButton');
  if (saveButton) {
    console.log('Likleaner: Found save button, adding click listener');
    saveButton.addEventListener('click', function() {
      console.log('Likleaner: Save button clicked');
      saveOptions();
    });
  } else {
    console.error('Likleaner: Save button not found!');
  }
  
  // Test button
  const testButton = document.getElementById('testButton');
  if (testButton) {
    console.log('Likleaner: Found test button, adding click listener');
    testButton.addEventListener('click', function() {
      console.log('Likleaner: Test button clicked');
      testConnection();
    });
  } else {
    console.error('Likleaner: Test button not found!');
  }
  
  // Toggle visibility link
  const toggleLink = document.getElementById('toggleVisibility');
  if (toggleLink) {
    console.log('Likleaner: Found toggle link, adding click listener');
    toggleLink.addEventListener('click', function() {
      console.log('Likleaner: Toggle visibility clicked');
      toggleVisibility();
    });
  } else {
    console.error('Likleaner: Toggle visibility link not found!');
  }
}

// Load saved options
function loadOptions() {
  console.log('Likleaner: Loading saved options...');
  
  chrome.storage.sync.get({
    oaiKey: '',
    debugMode: true,
    minPostLength: 30,
    maxConcurrentClassifications: 3
  }, (items) => {
    console.log('Likleaner: Loaded options:', items);
    
    document.getElementById('apiKey').value = items.oaiKey;
    document.getElementById('debugMode').checked = items.debugMode;
    document.getElementById('minPostLength').value = items.minPostLength;
    document.getElementById('maxConcurrent').value = items.maxConcurrentClassifications;
    
    console.log('Likleaner: Options loaded into form');
  });
}

// Save options
function saveOptions() {
  console.log('Likleaner: Save function called');
  
  const apiKey = document.getElementById('apiKey').value.trim();
  const debugMode = document.getElementById('debugMode').checked;
  const minPostLength = parseInt(document.getElementById('minPostLength').value);
  const maxConcurrent = parseInt(document.getElementById('maxConcurrent').value);

  console.log('Likleaner: Form values:', { 
    apiKeyLength: apiKey.length, 
    debugMode, 
    minPostLength, 
    maxConcurrent 
  });

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

  console.log('Likleaner: Validation passed, saving to storage...');

  chrome.storage.sync.set({
    oaiKey: apiKey,
    debugMode: debugMode,
    minPostLength: minPostLength,
    maxConcurrentClassifications: maxConcurrent
  }, () => {
    console.log('Likleaner: Settings saved successfully');
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
  console.log('Likleaner: Test connection function called');
  
  const apiKey = document.getElementById('apiKey').value.trim();
  
  console.log('Likleaner: API key length:', apiKey.length);
  
  if (!apiKey) {
    showStatus('Please enter an API key first', 'error');
    return;
  }

  if (!apiKey.startsWith('sk-')) {
    showStatus('Invalid API key format. Must start with "sk-"', 'error');
    return;
  }

  showStatus('Testing API connection...', 'info');
  console.log('Likleaner: Making test request to OpenAI API...');

  try {
    const requestBody = {
      model: 'gpt-3.5-turbo-0125',
      temperature: 0,
      max_tokens: 5,
      messages: [
        { 
          role: 'system',
          content: 'Classify LinkedIn posts. Return ONLY one word: hype, cringe, motivational, or other.'
        },
        { 
          role: 'user', 
          content: 'Just disrupted the entire industry with my groundbreaking AI startup! 🚀 Who else is ready to change the game? #hustle #entrepreneur #gamechanging'
        }
      ]
    };

    console.log('Likleaner: Request payload:', requestBody);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Likleaner: Response status:', response.status);
    console.log('Likleaner: Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Likleaner: API error response:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: { message: errorText } };
      }
      
      throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || errorText}`);
    }

    const data = await response.json();
    console.log('Likleaner: API response data:', data);
    
    const classification = data.choices?.[0]?.message?.content?.trim()?.toLowerCase() || 'unknown';
    console.log('Likleaner: Extracted classification:', classification);
    
    showStatus(`✅ API connection successful! Test classification: "${classification}" (Expected: hype/cringe)`, 'success');
    
    // Additional validation
    if (classification === 'other') {
      showStatus(`⚠️ API connected but classified test post as "other". This might indicate the prompt needs adjustment.`, 'error');
    }
    
  } catch (error) {
    console.error('Likleaner: API test failed with error:', error);
    
    if (error.message.includes('401')) {
      showStatus('❌ Invalid API key. Please check your key and try again.', 'error');
    } else if (error.message.includes('429')) {
      showStatus('❌ Rate limit exceeded. Please wait and try again.', 'error');
    } else if (error.message.includes('quota')) {
      showStatus('❌ API quota exceeded. Please check your OpenAI billing.', 'error');
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      showStatus('❌ Network error. Check your internet connection.', 'error');
    } else {
      showStatus(`❌ API test failed: ${error.message}`, 'error');
    }
  }
}

// Toggle API key visibility
function toggleVisibility() {
  console.log('Likleaner: Toggle visibility function called');
  
  const apiKeyInput = document.getElementById('apiKey');
  if (!apiKeyInput) {
    console.error('Likleaner: API key input not found!');
    return;
  }
  
  const currentType = apiKeyInput.type;
  console.log('Likleaner: Current input type:', currentType);
  
  apiKeyInput.type = currentType === 'password' ? 'text' : 'password';
  console.log('Likleaner: Changed input type to:', apiKeyInput.type);
}

console.log('�� LinkeBlock options.js loaded'); 