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

/* --------- Text Replacement Effects --------- */

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
      replacePostContent(post, cachedLabel);
    }
    return;
  }
  
  // Add visual indicator that post is being analyzed
  post.classList.add('le-analyzing');
  
  if (CONFIG.debugMode) {
    console.log('LinkExploder: Sending post for AI classification...');
    console.log('Post text (first 200 chars):', postText.slice(0, 200));
    console.log('Post element:', post);
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
      
      // Replace post if classified as problematic content
      if (['hype', 'cringe', 'motivational'].includes(label)) {
        replacePostContent(post, label);
      }
    }
  );
}

// Trigger text replacement instead of explosion
function replacePostContent(post, label) {
  if (post.classList.contains('le-replaced') || post.classList.contains('exploded')) {
    return;
  }
  
  post.classList.add('le-replaced');
  
  if (CONFIG.debugMode) {
    console.log(`LinkExploder: Replacing "${label}" post with explanation`);
  }
  
  // Generate replacement text based on label
  let replacementText = '';
  let backgroundColor = '#f0f0f0';
  let textColor = '#666';
  
  switch (label) {
    case 'hype':
      replacementText = '🎯 EDITED: This was AI hype nonsense.';
      backgroundColor = '#fff3cd';
      textColor = '#856404';
      break;
    case 'cringe':
      replacementText = '😬 EDITED: This was peak LinkedIn cringe.';
      backgroundColor = '#f8d7da';
      textColor = '#721c24';
      break;
    case 'motivational':
      replacementText = '💪 EDITED: This was motivational spam.';
      backgroundColor = '#d1ecf1';
      textColor = '#0c5460';
      break;
    default:
      replacementText = '🤖 EDITED: This post was flagged by AI.';
      backgroundColor = '#e2e3e5';
      textColor = '#383d41';
  }
  
  // Create replacement content
  const replacement = document.createElement('div');
  replacement.className = 'le-replacement';
  replacement.style.cssText = `
    padding: 20px;
    margin: 10px 0;
    background-color: ${backgroundColor};
    color: ${textColor};
    border-radius: 8px;
    font-weight: bold;
    font-size: 16px;
    text-align: center;
    border: 2px solid ${textColor}40;
    cursor: pointer;
    transition: all 0.3s ease;
  `;
  replacement.textContent = replacementText;
  
  // Add hover effect to show original content
  const originalContent = post.innerHTML;
  let isShowingOriginal = false;
  
  replacement.addEventListener('click', () => {
    if (isShowingOriginal) {
      replacement.textContent = replacementText;
      replacement.style.fontSize = '16px';
      replacement.style.fontWeight = 'bold';
      isShowingOriginal = false;
    } else {
      replacement.innerHTML = `<small style="opacity: 0.8;">Original post:</small><br><div style="font-weight: normal; font-size: 14px; margin-top: 8px; opacity: 0.9;">${originalContent}</div>`;
      isShowingOriginal = true;
    }
  });
  
  // Add label-specific class for styling
  replacement.classList.add(`le-${label}`);
  
  // Replace the post content
  post.innerHTML = '';
  post.appendChild(replacement);
  
  // Add fade-in animation
  replacement.style.opacity = '0';
  replacement.style.transform = 'translateY(-10px)';
  
  setTimeout(() => {
    replacement.style.opacity = '1';
    replacement.style.transform = 'translateY(0)';
  }, 100);
}

/* --------- AI-powered intersection observer --------- */
const io = new IntersectionObserver(entries => {
  let processed = 0;
  
  if (CONFIG.debugMode && entries.length > 0) {
    console.log(`LinkExploder: IntersectionObserver triggered with ${entries.length} entries`);
  }
  
  for (const entry of entries) {
    if (!entry.isIntersecting || processed >= CONFIG.maxConcurrentClassifications) continue;
    
    const post = entry.target;
    
    if (CONFIG.debugMode) {
      console.log('LinkExploder: Checking post:', {
        element: post,
        isIntersecting: entry.isIntersecting,
        classes: post.className,
        textLength: post.textContent?.length || 0
      });
    }
    
    // Skip if already processed or being processed
    if (post.classList.contains('le-checked') || 
        post.classList.contains('le-analyzing') ||
        post.classList.contains('le-replaced')) {
      
      if (CONFIG.debugMode) {
        console.log('LinkExploder: Skipping already processed post');
      }
      continue;
    }
    
    // Check if post has sufficient content
    const postText = post.textContent?.trim() || '';
    if (postText.length < CONFIG.minPostLength) {
      if (CONFIG.debugMode) {
        console.log(`LinkExploder: Skipping short post (${postText.length} chars, min ${CONFIG.minPostLength})`);
      }
      continue;
    }
    
    processed++;
    
    if (CONFIG.debugMode) {
      console.log(`LinkExploder: Processing post ${processed}/${CONFIG.maxConcurrentClassifications}`);
    }
    
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

// Manual page scan for debugging
window.debugLinkExploderPosts = function() {
  console.log('LinkExploder: Manual page scan...');
  
  const selectors = [
    '[data-urn*="activity"]',
    '.feed-shared-update-v2', 
    '.occludable-update'
  ];
  
  let totalFound = 0;
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    console.log(`Selector "${selector}": ${elements.length} elements found`);
    totalFound += elements.length;
    
    // Show first few examples
    Array.from(elements).slice(0, 3).forEach((element, i) => {
      const text = element.textContent?.trim() || '';
      console.log(`Example ${i + 1}:`, {
        element: element,
        textLength: text.length,
        textPreview: text.slice(0, 100) + '...',
        classes: element.className
      });
    });
  });
  
  console.log(`Total posts found: ${totalFound}`);
  
  // Try to observe a few posts manually
  if (totalFound > 0) {
    const firstPost = document.querySelector(selectors.join(', '));
    if (firstPost) {
      console.log('Trying to classify first post manually...');
      classifyAndExplode(firstPost);
    }
  }
  
  return totalFound;
};

console.log('🤖 LinkExploder v3.1: AI-Powered LinkedIn Content Replacer loaded!');
console.log('⚙️ Right-click extension icon → Options to configure your OpenAI API key');
console.log('🧪 Type testClassification("post text") to test the AI classifier');
console.log('🔧 Type configureLinkExploder({debugMode: true}) to enable detailed logging');
console.log('🔍 Type debugLinkExploderPosts() to scan current page for posts');
console.log('🗑️ Type clearLinkExploderCache() to clear the classification cache'); 