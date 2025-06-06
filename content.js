// LinkExploder - AI-Powered LinkedIn Post Hunter v3.0
// Now using GPT-3.5-turbo for intelligent content classification

/* --------- Configuration --------- */
const CONFIG = {
  debugMode: true,
  reducedMode: false,
  bypassBusyDetection: false,
  maxConcurrentClassifications: 3,
  classificationDelay: 200, // ms between classifications
  minPostLength: 30 // minimum characters for classification
};

// Extension context validation
let extensionContextValid = true;

// Check if extension context is still valid
function checkExtensionContext() {
  try {
    if (chrome && chrome.runtime && chrome.runtime.id) {
      return true;
    }
  } catch (error) {
    console.warn('LinkExploder: Extension context invalidated');
    extensionContextValid = false;
    return false;
  }
  return false;
}

// Function to check if LinkedIn is busy with search or navigation
function isLinkedInBusy() {
  // Check if search is active
  const searchInput = document.querySelector('input[placeholder*="Search"], .search-global-typeahead__input');
  if (searchInput && (document.activeElement === searchInput || searchInput.value.trim() !== '')) {
    return true;
  }
  
  // Check if navigation is happening
  const loadingIndicators = document.querySelectorAll('.loader, .loading, [aria-label*="Loading"], .artdeco-loader');
  if (loadingIndicators.length > 0) {
    return true;
  }
  
  // Check if any modals or overlays are open
  const modals = document.querySelectorAll('.artdeco-modal, .modal, [role="dialog"]');
  return modals.length > 0;
}

/* --------- Explosion Effects (preserved from original) --------- */
function createShootingEffect(startX, startY, endX, endY) {
  const bullet = document.createElement('div');
  bullet.className = 'bullet';
  document.body.appendChild(bullet);

  const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);
  bullet.style.transform = `rotate(${angle}deg)`;
  bullet.style.left = `${startX}px`;
  bullet.style.top = `${startY}px`;
  bullet.style.animation = 'shoot 0.2s linear forwards';

  setTimeout(() => bullet.remove(), 200);
}

function createExplosion(element, centerX, centerY, label = 'ai') {
  if (!element || element.classList.contains('exploded')) return;
  
  element.classList.add('exploded');
  
  const explosionContainer = document.createElement('div');
  explosionContainer.className = 'explosion-container';
  explosionContainer.style.left = centerX + 'px';
  explosionContainer.style.top = centerY + 'px';
  
  // Label-specific explosion colors
  let colors = ['#ff4444', '#ffaa00', '#ff8800', '#ffcc00', '#ff0000', '#ffff00'];
  let particleCount = 50;
  
  if (label === 'hype') {
    colors = ['#ff6b6b', '#ff8e53', '#ff6b9d', '#c44569', '#f8b500']; // Hot colors
    particleCount = 60;
  } else if (label === 'cringe') {
    colors = ['#6c5ce7', '#fd79a8', '#fdcb6e', '#e17055', '#00b894']; // Cringe colors
    particleCount = 45;
  } else if (label === 'motivational') {
    colors = ['#0984e3', '#00cec9', '#00b894', '#55a3ff', '#74b9ff']; // Motivational blue/teal
    particleCount = 55;
  }
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    
    const angle = (Math.random() * 360) * (Math.PI / 180);
    const velocity = 150 + Math.random() * 300;
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity;
    
    particle.style.setProperty('--tx', `${tx}px`);
    particle.style.setProperty('--ty', `${ty}px`);
    
    explosionContainer.appendChild(particle);
  }
  
  document.body.appendChild(explosionContainer);
  element.classList.add('fade-explode');
  
  setTimeout(() => {
    explosionContainer.remove();
    element.remove();
  }, 1000);
}

/* --------- AI Classification System --------- */
// Session cache for classifications to avoid redundant API calls
const classificationCache = new Map();

// Generate a simple hash for caching
function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

// AI-powered classification function
function classifyAndExplode(post) {
  if (post.classList.contains('le-checked') || 
      post.classList.contains('exploded') || 
      post.classList.contains('fade-explode')) {
    return;
  }
  
  post.classList.add('le-checked');
  
  // Get post text and create hash for caching
  const postText = post.textContent.trim();
  if (!postText || postText.length < CONFIG.minPostLength) {
    return; // Skip posts that are too short
  }
  
  const textHash = hashText(postText);
  
  // Check cache first
  if (classificationCache.has(textHash)) {
    const cachedLabel = classificationCache.get(textHash);
    if (CONFIG.debugMode) {
      console.log(`LinkExploder: Using cached classification: "${cachedLabel}"`);
    }
    
    if (['hype', 'cringe', 'motivational'].includes(cachedLabel)) {
      triggerExplosion(post, cachedLabel);
    }
    return;
  }
  
  // Add visual indicator that post is being analyzed
  post.classList.add('le-analyzing');
  
  if (CONFIG.debugMode) {
    console.log('LinkExploder: Sending post for AI classification...', postText.slice(0, 100));
  }
  
  // Send to background worker for classification
  chrome.runtime.sendMessage(
    { type: 'classify', text: postText },
    response => {
      // Remove analyzing indicator
      post.classList.remove('le-analyzing');
      
      if (chrome.runtime.lastError) {
        console.error('LinkExploder: Classification failed:', chrome.runtime.lastError);
        return;
      }
      
      const label = response || 'other';
      
      // Cache the result
      classificationCache.set(textHash, label);
      
      if (CONFIG.debugMode) {
        console.log(`LinkExploder: AI classification result: "${label}" for post:`, postText.slice(0, 100));
      }
      
      // Explode if classified as problematic content
      if (['hype', 'cringe', 'motivational'].includes(label)) {
        triggerExplosion(post, label);
      }
    }
  );
}

// Trigger explosion with label-specific effects
function triggerExplosion(post, label) {
  if (post.classList.contains('exploded') || post.classList.contains('fade-explode')) {
    return;
  }
  
  if (CONFIG.debugMode) {
    console.log(`LinkExploder: Triggering explosion for "${label}" post`);
  }
  
  // Add label-specific class for different explosion themes
  post.classList.add(`le-${label}`);
  
  // Get post dimensions for explosion center
  const rect = post.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  // Only explode if the post is visible on screen
  if (rect.top < window.innerHeight && rect.bottom > 0) {
    // Create shooting effect from bottom right corner to post center
    setTimeout(() => {
      createShootingEffect(window.innerWidth - 50, window.innerHeight - 50, centerX, centerY);
    }, 100);
    
    // Add explosion after shooting
    setTimeout(() => {
      createExplosion(post, centerX, centerY, label);
    }, 300);
  }
}

/* --------- AI-powered intersection observer --------- */
const io = new IntersectionObserver(entries => {
  let processed = 0;
  
  for (const entry of entries) {
    if (!entry.isIntersecting || processed >= CONFIG.maxConcurrentClassifications) continue;
    
    const post = entry.target;
    
    // Skip if already processed or being processed
    if (post.classList.contains('le-checked') || 
        post.classList.contains('le-analyzing') ||
        post.classList.contains('exploded')) {
      continue;
    }
    
    // Check if post has sufficient content
    const postText = post.textContent?.trim() || '';
    if (postText.length < CONFIG.minPostLength) continue;
    
    processed++;
    
    // Use AI classification instead of keyword matching
    classifyAndExplode(post);
  }
}, { threshold: 0.5 });

/* --------- Monitor for new posts --------- */
const mo = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType !== 1 || !node.textContent) return;
      
      // Look for post elements
      if (node.matches?.('[data-urn*="activity"]') || 
          node.matches?.('.feed-shared-update-v2') ||
          node.matches?.('.occludable-update')) {
        io.observe(node);
      }
      
      // Also check child elements for posts
      const posts = node.querySelectorAll?.(
        '[data-urn*="activity"], .feed-shared-update-v2, .occludable-update'
      );
      posts?.forEach(post => io.observe(post));
    });
  }
});

// Start observing feed containers
const FEED_SELECTORS = '#main, div.core-rail, .scaffold-finite-scroll, .feed-container';
document.querySelectorAll(FEED_SELECTORS).forEach(container => {
  mo.observe(container, { childList: true, subtree: true });
});

// Also observe existing posts on page load
setTimeout(() => {
  document.querySelectorAll('[data-urn*="activity"], .feed-shared-update-v2, .occludable-update')
    .forEach(post => io.observe(post));
}, 1000);

/* --------- Helper Functions --------- */
// API key management function
window.setLinkExploderApiKey = function(apiKey) {
  chrome.storage.sync.set({ oaiKey: apiKey }, () => {
    console.log('✅ LinkExploder: OpenAI API key saved successfully');
    console.log('🔄 Please refresh the page to start AI-powered detection');
  });
};

// Configuration function
window.configureLinkExploder = function(options = {}) {
  Object.keys(options).forEach(key => {
    if (CONFIG.hasOwnProperty(key)) {
      CONFIG[key] = options[key];
      console.log(`LinkExploder: ${key} set to`, options[key]);
    }
  });
  console.log('Current configuration:', CONFIG);
};

// Manual classification test
window.testClassification = function(text) {
  if (!text) {
    console.log('Usage: testClassification("your post text here")');
    return;
  }
  
  chrome.runtime.sendMessage(
    { type: 'classify', text: text },
    response => {
      console.log(`Classification result: "${response}" for text: "${text.slice(0, 50)}..."`);
    }
  );
};

// Clear classification cache
window.clearLinkExploderCache = function() {
  classificationCache.clear();
  console.log('✅ LinkExploder: Classification cache cleared');
};

console.log('🤖 LinkExploder v3.0: AI-Powered LinkedIn Post Hunter loaded!');
console.log('🔧 Type setLinkExploderApiKey("your-api-key") to set your OpenAI API key');
console.log('⚙️ Type configureLinkExploder({debugMode: false}) to adjust settings');
console.log('🧪 Type testClassification("post text") to test the AI classifier');
console.log('🗑️ Type clearLinkExploderCache() to clear the classification cache'); 