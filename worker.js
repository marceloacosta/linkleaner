// worker.js - classifies LinkedIn post snippets via GPT-3.5-turbo-0125
const MODEL = 'gpt-3.5-turbo-0125';
let OAI_KEY = null; // Will be loaded from storage

// Load API key from storage on startup
chrome.storage.sync.get('oaiKey', ({oaiKey}) => {
  OAI_KEY = oaiKey;
  if (!OAI_KEY) {
    console.warn('LinkExploder: No OpenAI API key found. Please set it in extension options.');
  } else {
    console.log('LinkExploder: OpenAI API key loaded successfully');
  }
});

// Rate limiting
let inflight = 0;
const MAX_CONCURRENT = 2;

chrome.runtime.onMessage.addListener((msg, _src, respond) => {
  // Handle API key updates from options page
  if (msg.type === 'updateApiKey') {
    OAI_KEY = msg.apiKey;
    console.log('LinkExploder: API key updated from options page');
    return;
  }
  
  if (msg.type !== 'classify') return; // ignore other traffic

  // Check for API key
  if (!OAI_KEY) {
    console.warn('LinkExploder: No API key available for classification');
    respond('other');
    return;
  }

  // Rate limiting
  if (inflight >= MAX_CONCURRENT) {
    console.log('LinkExploder: Rate limit reached, skipping classification');
    respond('other');
    return;
  }

  inflight++;
  console.log(`LinkExploder: Classifying post (${inflight}/${MAX_CONCURRENT} active)`);

  fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OAI_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 5,
      messages: [
        { 
          role: 'system',
          content: `Classify LinkedIn posts into categories. Return ONLY one word:

"hype" - AI/tech buzzword spam, "game-changing" claims, "disrupting industries"
"cringe" - Humble bragging, fake modesty, excessive emoji use, "I'm humbled to announce"  
"motivational" - Generic motivational quotes, hustle culture, "grind never stops"
"other" - Normal professional posts, job updates, genuine insights

Examples:
- "Just disrupted the entire AI industry! 🚀 #gamechanging" → hype
- "I'm humbled to announce my promotion to CEO of myself 💪" → cringe  
- "The grind never stops! Rise and grind every day! 💯" → motivational
- "Sharing some insights from our quarterly review meeting" → other

Return only: hype, cringe, motivational, or other`
        },
        { 
          role: 'user', 
          content: msg.text.slice(0, 300) // Increased from 256 to 300 for more context
        }
      ]
    })
  })
  .then(r => {
    if (!r.ok) {
      throw new Error(`API request failed: ${r.status} ${r.statusText}`);
    }
    return r.json();
  })
  .then(j => {
    const label = j.choices?.[0]?.message?.content.trim().toLowerCase() || 'other';
    console.log(`LinkExploder: Classification result: "${label}"`);
    respond(label);
  })
  .catch(error => {
    console.error('LinkExploder: Classification failed:', error);
    respond('other');
  })
  .finally(() => {
    inflight--;
  });

  return true; // keep message port open for async response
});

// Listen for storage changes to update API key
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.oaiKey) {
    OAI_KEY = changes.oaiKey.newValue;
    console.log('LinkExploder: API key updated');
  }
});

console.log('LinkExploder: Background service worker loaded'); 