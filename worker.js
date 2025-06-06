// worker.js - Service Worker for LinkExploder (Manifest V3)
// Classifies LinkedIn post snippets via GPT-4o-mini for better accuracy

console.log('🚀 LinkExploder Service Worker v3.3 starting...');

// Enhanced Service Worker for AI-powered LinkedIn post analysis
// Now generates actual summaries instead of just classifications

let openaiApiKey = null;
let isInitialized = false;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const REQUEST_TIMEOUT = 10000; // 10 seconds

// Circuit breaker for API failures
let circuitBreakerState = {
  failureCount: 0,
  lastFailureTime: null,
  isOpen: false,
  threshold: 3,
  timeout: 300000 // 5 minutes
};

// Initialize API key
chrome.runtime.onStartup.addListener(initializeApiKey);
chrome.runtime.onInstalled.addListener(initializeApiKey);

async function initializeApiKey() {
  try {
    const result = await chrome.storage.local.get(['openai_api_key']);
    if (result.openai_api_key) {
      openaiApiKey = result.openai_api_key;
      console.log('✅ OpenAI API key loaded successfully (length:', openaiApiKey.length, ')');
      isInitialized = true;
    } else {
      console.error('❌ No OpenAI API key found in storage');
    }
  } catch (error) {
    console.error('❌ Failed to load API key:', error);
  }
}

// Initialize on startup
initializeApiKey();

function isCircuitBreakerOpen() {
  if (!circuitBreakerState.isOpen) return false;
  
  const timeSinceLastFailure = Date.now() - circuitBreakerState.lastFailureTime;
  if (timeSinceLastFailure > circuitBreakerState.timeout) {
    console.log('🔄 Circuit breaker timeout expired, resetting...');
    circuitBreakerState.isOpen = false;
    circuitBreakerState.failureCount = 0;
    return false;
  }
  
  return true;
}

function recordFailure() {
  circuitBreakerState.failureCount++;
  circuitBreakerState.lastFailureTime = Date.now();
  
  if (circuitBreakerState.failureCount >= circuitBreakerState.threshold) {
    circuitBreakerState.isOpen = true;
    console.warn(`🚨 Circuit breaker opened after ${circuitBreakerState.failureCount} failures`);
  }
}

function recordSuccess() {
  circuitBreakerState.failureCount = 0;
  circuitBreakerState.isOpen = false;
}

async function generateSummary(text, retryCount = 0) {
  // Check if we need to initialize
  if (!isInitialized || !openaiApiKey) {
    console.warn('⚠️ Service worker not initialized, attempting to reload API key...');
    await initializeApiKey();
    
    if (!isInitialized || !openaiApiKey) {
      console.error('❌ Still no API key after reload attempt');
      return '🔧 CONFIG ERROR: No OpenAI API key found. Click extension icon → Options to set your key.';
    }
    console.log('✅ API key reloaded successfully');
  }

  if (isCircuitBreakerOpen()) {
    console.warn('🚨 Circuit breaker is open, skipping API call');
    return '⏸️ SERVICE PAUSED: Too many errors, please wait a few minutes';
  }

  // Limit text length to avoid token limits and improve performance
  const truncatedText = text.length > 200 ? text.substring(0, 200) + '...' : text;

  const prompt = `You are a sarcastic LinkedIn post analyzer. Generate a SHORT, PUNCHY summary (max 80 characters) that exposes what this post is really about. Be brutally honest and detect:

- Cringy motivational content
- Clickbait and engagement farming
- Humble bragging disguised as gratitude
- Desperate pleas for attention/validation
- Attempts to gather info for spam/sales
- Selling disguised as advice
- Complaints disguised as insights
- Valuable content buried in too much text
- Virtue signaling
- Fake authenticity

Use these formats:
- "🎭 CRINGE ALERT: [what they're really doing]"
- "🎣 CLICKBAIT: [the obvious manipulation]"
- "🤡 HUMBLE BRAG: [the disguised boasting]"
- "😭 DESPERATE: [the plea for attention]"
- "🕷️ SPAM PREP: [info gathering attempt]"
- "💸 SALES PITCH: [disguised selling]"
- "😤 COMPLAINT: [what they're whining about]"
- "📚 TOO LONG: [the buried point]"
- "🎪 VIRTUE SIGNAL: [the fake caring]"
- "🎭 FAKE DEEP: [the shallow insight]"

Post content: "${truncatedText}"

Summary:`;

  const requestBody = {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a sarcastic social media analyst who creates brutally honest, short summaries of LinkedIn posts. Keep responses under 80 characters and be direct about what the poster is really doing.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 100,
    temperature: 0.8,
    top_p: 0.9
  };

  try {
    console.log('🤖 Generating summary for text:', truncatedText.substring(0, 50) + '...');
    console.log('🔑 Using API key length:', openaiApiKey ? openaiApiKey.length : 'NO KEY');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      
      // Handle specific error cases
      if (response.status === 429) {
        console.warn('⚠️ Rate limited, will retry after delay');
        if (retryCount < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
          return generateSummary(text, retryCount + 1);
        }
        recordFailure();
        return '🚫 RATE LIMITED: Too many requests, try again later';
      }
      
      if (response.status >= 500) {
        console.warn('⚠️ Server error, will retry');
        if (retryCount < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
          return generateSummary(text, retryCount + 1);
        }
        recordFailure();
        return '🔧 SERVER ERROR: OpenAI temporarily unavailable';
      }
      
      recordFailure();
      return '❌ API ERROR: Unable to analyze post';
    }

    const data = await response.json();
    console.log('✅ OpenAI response received:', data);

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ Invalid response format from OpenAI');
      recordFailure();
      return '🤖 AI CONFUSED: Unexpected response format';
    }

    const summary = data.choices[0].message.content.trim();
    console.log('🎯 Generated summary:', summary);
    
    // Clean up the summary (remove quotes, ensure proper format)
    let cleanSummary = summary.replace(/^["']|["']$/g, '').trim();
    
    // Ensure it has an emoji prefix if it doesn't already
    if (!cleanSummary.match(/^[🎭🎣🤡😭🕷️💸😤📚🎪🔥⚡🤖🎯]/)) {
      cleanSummary = '🎯 ' + cleanSummary;
    }
    
    recordSuccess();
    return cleanSummary;

  } catch (error) {
    console.error('❌ Summary generation failed:', error);
    
    if (error.name === 'AbortError') {
      console.warn('⏱️ Request timed out');
      recordFailure();
      return '⏱️ TIMEOUT: Analysis took too long';
    }
    
    if (retryCount < MAX_RETRIES) {
      console.log(`🔄 Retrying... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return generateSummary(text, retryCount + 1);
    }
    
    recordFailure();
    return '🔧 ANALYSIS FAILED: Unable to process this post';
  }
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Service worker received message:', message.type);
  
  // Handle API key reload from options page
  if (message.type === 'reloadApiKey') {
    console.log('🔄 Reloading API key from storage...');
    initializeApiKey().then(() => {
      sendResponse({ success: true, initialized: isInitialized });
    });
    return true;
  }
  
  if (message.type === 'generateSummary') {
    // Handle async summary generation
    generateSummary(message.text)
      .then(summary => {
        console.log('✅ Sending summary response:', summary);
        sendResponse({ summary });
      })
      .catch(error => {
        console.error('❌ Summary generation error:', error);
        sendResponse({ summary: '🔧 ERROR: Unable to analyze post' });
      });
    
    // Return true to indicate we'll send response asynchronously
    return true;
  }
  
  // Keep the old classify endpoint for backward compatibility during transition
  if (message.type === 'classify') {
    generateSummary(message.text)
      .then(summary => {
        sendResponse({ summary });
      })
      .catch(error => {
        console.error('❌ Classification error:', error);
        sendResponse({ summary: '🔧 ERROR: Unable to analyze post' });
      });
    
    return true;
  }
});

console.log('✅ LinkExploder Service Worker v3.3 initialized with AI summary generation'); 