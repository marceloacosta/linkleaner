// Debounce function to prevent too many calls
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Audio preloading and management
let explosionAudio = null;
let audioReady = false;
let extensionContextValid = true;

// Check if extension context is still valid
function checkExtensionContext() {
  try {
    // Try to access chrome.runtime - this will throw if context is invalidated
    if (chrome && chrome.runtime && chrome.runtime.id) {
      return true;
    }
  } catch (error) {
    console.warn('LinkExploder: Extension context invalidated, stopping script execution');
    extensionContextValid = false;
    showContextInvalidatedNotification();
    return false;
  }
  return false;
}

// Show a user-friendly notification when extension context is invalidated
function showContextInvalidatedNotification() {
  // Only show notification once
  if (document.getElementById('linkexploder-context-notification')) {
    return;
  }
  
  const notification = document.createElement('div');
  notification.id = 'linkexploder-context-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(45deg, #ff4444, #ff8800);
    color: white;
    padding: 15px 20px;
    border-radius: 10px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: bold;
    z-index: 10000;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    max-width: 300px;
    cursor: pointer;
    animation: slideIn 0.5s ease-out;
  `;
  
  notification.innerHTML = `
    🎯 LinkExploder: Extension Reloaded<br>
    <small style="font-weight: normal; opacity: 0.9;">Please refresh this page to resume explosions!</small>
  `;
  
  // Add slide-in animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  // Remove notification on click or after 10 seconds
  notification.addEventListener('click', () => {
    notification.remove();
    style.remove();
  });
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
      style.remove();
    }
  }, 10000);
  
  document.body.appendChild(notification);
}

function initializeAudio() {
  if (!checkExtensionContext()) {
    console.warn('LinkExploder: Cannot initialize audio - extension context invalidated');
    return;
  }
  
  try {
    explosionAudio = new Audio(chrome.runtime.getURL('explosion.mp3'));
    explosionAudio.volume = 0.4;
    explosionAudio.preload = 'auto';
    
    explosionAudio.addEventListener('canplaythrough', () => {
      audioReady = true;
      console.log('LinkExploder: Explosion audio preloaded and ready');
    });
    
    explosionAudio.addEventListener('error', (e) => {
      console.warn('LinkExploder: Audio preload failed:', e);
      audioReady = false;
    });
    
    // Try to load the audio
    explosionAudio.load();
  } catch (error) {
    if (error.message.includes('Extension context invalidated')) {
      console.warn('LinkExploder: Extension was reloaded, please refresh the page');
      extensionContextValid = false;
      return;
    }
    console.error('LinkExploder: Audio initialization failed:', error);
    audioReady = false;
  }
}

// Initialize audio when extension loads (with context check)
if (checkExtensionContext()) {
  initializeAudio();
}

// Target keywords and emojis that trigger explosions
const TARGET_KEYWORDS = [
  "changed the game",
  "changed the ai game", 
  "that changed everything",
  "💸",
  "🛑", 
  "🚀"
];

// Special hashtag detection - now more selective and DISABLED by default
const HASHTAG_TRIGGER = false; // Set to true to explode posts with hashtags (DISABLED by default)
const HASHTAG_THRESHOLD = 5; // Minimum number of hashtags to trigger explosion (increased threshold)

// Configuration
const CONFIG = {
  maxExplosionsPerScan: 2,  // Limit explosions per scan to be safe
  enableHashtagDetection: true,  // Enable hashtag detection for spammy posts
  hashtagThreshold: 5,  // Target posts with MORE than 4 hashtags (5+)
  debugMode: true  // Set to false to reduce console spam
};

// Function to create shooting effect
function createShootingEffect(startX, startY, endX, endY) {
  const bullet = document.createElement('div');
  bullet.className = 'bullet';
  document.body.appendChild(bullet);

  // Calculate angle for bullet rotation
  const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);
  bullet.style.transform = `rotate(${angle}deg)`;

  bullet.style.setProperty('--startX', `${startX}px`);
  bullet.style.setProperty('--startY', `${startY}px`);
  bullet.style.setProperty('--endX', `${endX}px`);
  bullet.style.setProperty('--endY', `${endY}px`);

  bullet.style.left = `${startX}px`;
  bullet.style.top = `${startY}px`;

  bullet.style.animation = 'shoot 0.2s linear forwards';

  setTimeout(() => bullet.remove(), 200);
}

// Function to create explosion effect
function createExplosion(element, centerX, centerY, matchedKeyword = '') {
  if (!element || element.classList.contains('exploded')) return;
  
  // Check if extension context is still valid
  if (!extensionContextValid || !checkExtensionContext()) {
    console.warn('LinkExploder: Skipping explosion - extension context invalidated. Please refresh the page.');
    return;
  }
  
  // Mark as exploded to prevent multiple explosions
  element.classList.add('exploded');
  
  // Play preloaded explosion sound
  if (audioReady && explosionAudio) {
    try {
      // Reset audio to beginning in case it's already played
      explosionAudio.currentTime = 0;
      
      const playPromise = explosionAudio.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('LinkExploder: Audio played successfully');
        }).catch((error) => {
          console.warn('LinkExploder: Audio autoplay blocked:', error);
          console.log('LinkExploder: Audio will play on next user interaction');
          
          // Set up one-time click listener for audio
          const enableAudio = () => {
            if (explosionAudio && extensionContextValid) {
              explosionAudio.play().then(() => {
                console.log('LinkExploder: Audio enabled after user interaction');
              }).catch(e => console.warn('LinkExploder: Audio still failed:', e));
            }
            document.removeEventListener('click', enableAudio);
          };
          
          document.addEventListener('click', enableAudio, { once: true });
        });
      }
    } catch (audioError) {
      if (audioError.message.includes('Extension context invalidated')) {
        console.warn('LinkExploder: Audio failed - extension reloaded. Please refresh the page.');
        extensionContextValid = false;
        return;
      }
      console.error('LinkExploder: Audio playback failed:', audioError);
    }
  } else if (extensionContextValid) {
    console.warn('LinkExploder: Audio not ready yet, retrying initialization...');
    initializeAudio(); // Retry audio initialization
  }
  
  const explosionContainer = document.createElement('div');
  explosionContainer.className = 'explosion-container';
  explosionContainer.style.left = centerX + 'px';
  explosionContainer.style.top = centerY + 'px';
  
  // Create more particles with varied colors based on keyword type
  let particleCount = 50;
  let colors = ['#ff4444', '#ffaa00', '#ff8800', '#ffcc00', '#ff0000', '#ffff00'];
  
  // Special effects for different keywords
  if (matchedKeyword.includes('💸')) {
    colors = ['#00ff00', '#ffff00', '#00cc00', '#ccff00', '#66ff66']; // Green money colors
    particleCount = 60;
  } else if (matchedKeyword.includes('🛑')) {
    colors = ['#ff0000', '#cc0000', '#ff3333', '#990000', '#ff6666']; // Red stop colors
    particleCount = 40;
  } else if (matchedKeyword.includes('🚀')) {
    colors = ['#0066ff', '#00ccff', '#3399ff', '#66b3ff', '#99ccff']; // Blue rocket colors
    particleCount = 70;
  } else if (matchedKeyword.includes('#')) {
    colors = ['#9966ff', '#cc99ff', '#6633cc', '#9933ff', '#b366ff']; // Purple hashtag colors
    particleCount = 45;
  }
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Randomly assign colors
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.left = '0px';
    particle.style.top = '0px';
    
    // Create more dynamic movement
    const angle = (Math.random() * 360) * (Math.PI / 180);
    const velocity = 150 + Math.random() * 300; // Increased velocity range
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity;
    const rotate = Math.random() * 720; // More rotation
    const scale = 0.5 + Math.random() * 1.5; // Random sizes
    
    particle.style.setProperty('--tx', `${tx}px`);
    particle.style.setProperty('--ty', `${ty}px`);
    particle.style.setProperty('--rotate', `${rotate}deg`);
    particle.style.setProperty('--scale', scale);
    
    explosionContainer.appendChild(particle);
  }
  
  // Add a central flash effect
  const flash = document.createElement('div');
  flash.className = 'explosion-flash';
  explosionContainer.appendChild(flash);
  
  document.body.appendChild(explosionContainer);
  
  // Add fade-explode animation to the post
  element.classList.add('fade-explode');
  
  // Clean up
  setTimeout(() => {
    explosionContainer.remove();
    element.remove();
  }, 1000); // Increased duration for longer effect
}

// Function to check if post contains any target keywords or emojis
function checkForTargetKeywords(postText) {
  const textLower = postText.toLowerCase();
  
  // Check for text keywords
  for (const keyword of TARGET_KEYWORDS) {
    if (keyword.length > 1 && textLower.includes(keyword.toLowerCase())) {
      return keyword;
    }
    // Check for emojis (they don't need toLowerCase)
    if (keyword.length === 1 && postText.includes(keyword)) {
      return keyword;
    }
  }
  
  // Check for hashtags if enabled - now much more selective and DISABLED by default
  if (CONFIG.enableHashtagDetection && postText.includes('#')) {
    const hashtags = postText.match(/#\w+/g);
    if (hashtags && hashtags.length >= CONFIG.hashtagThreshold) {
      if (CONFIG.debugMode) {
        console.log(`LinkExploder: Found ${hashtags.length} hashtags (threshold: ${CONFIG.hashtagThreshold}):`, hashtags);
      }
      return '#hashtag';
    }
    
    // Also check for specific problematic hashtag patterns
    const problematicHashtags = [
      '#entrepreneur', '#hustle', '#mindset', '#success', '#motivation',
      '#linkedininfluencer', '#thoughtleader', '#gamechange', '#disrupt',
      '#thoughtleadership', '#networking', '#leadership', '#inspiration'
    ];
    
    for (const problematicTag of problematicHashtags) {
      if (textLower.includes(problematicTag)) {
        if (CONFIG.debugMode) {
          console.log(`LinkExploder: Found problematic hashtag: ${problematicTag}`);
        }
        return '#hashtag';
      }
    }
  }
  
  return null;
}

// Function to highlight the keyword in posts before exploding them
function highlightKeywordInPost(post, keyword) {
  // Skip highlighting for emojis and hashtags (they're already visually distinct)
  if (keyword.length === 1 || keyword === '#hashtag') {
    return;
  }
  
  const walker = document.createTreeWalker(
    post,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const textNodes = [];
  let node;
  
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  
  textNodes.forEach(textNode => {
    const text = textNode.textContent;
    const regex = new RegExp(`(${keyword})`, 'gi');
    
    if (regex.test(text)) {
      const highlightedText = text.replace(regex, '<span class="keyword-highlight">$1</span>');
      const wrapper = document.createElement('div');
      wrapper.innerHTML = highlightedText;
      
      // Replace the text node with highlighted content
      const parent = textNode.parentNode;
      while (wrapper.firstChild) {
        parent.insertBefore(wrapper.firstChild, textNode);
      }
      parent.removeChild(textNode);
    }
  });
}

// Enhanced search function with multiple keyword support
function searchHighlightAndExplode() {
  // Check if extension context is still valid
  if (!extensionContextValid || !checkExtensionContext()) {
    console.warn('LinkExploder: Stopping search - extension context invalidated. Please refresh the page.');
    return;
  }
  
  // Much more specific post selectors to avoid catching non-post elements
  const posts = document.querySelectorAll([
    '.feed-shared-update-v2[data-urn*="activity"]',  // Only feed updates with activity URNs
    '.occludable-update[data-urn*="activity"]',      // Only occludable updates with activity URNs
    '[data-id^="urn:li:activity"]:not(.keyword-processed)',  // Activity URNs only, not already processed
    '.feed-shared-update-v2:not(.keyword-processed)'  // Feed updates not already processed
  ].join(', '));
  
  console.log(`LinkExploder: Found ${posts.length} potential posts to check`);
  
  // Safety mechanism - limit explosions per scan
  const MAX_EXPLOSIONS_PER_SCAN = CONFIG.maxExplosionsPerScan;
  let explosionCount = 0;
  
  posts.forEach((post, index) => {
    // Stop if we've reached the explosion limit
    if (explosionCount >= MAX_EXPLOSIONS_PER_SCAN) {
      console.log(`LinkExploder: Reached explosion limit (${MAX_EXPLOSIONS_PER_SCAN}) for this scan`);
      return;
    }
    
    // Skip if already processed
    if (post.classList.contains('exploded') || 
        post.classList.contains('fade-explode') || 
        post.classList.contains('keyword-processed')) {
      return;
    }
    
    // Additional validation - make sure this is actually a post
    if (!isValidPost(post)) {
      return;
    }
    
    // Get all text content from the post
    const postText = post.textContent;
    
    // Check if the post contains any target keywords
    const matchedKeyword = checkForTargetKeywords(postText);
    
    if (matchedKeyword) {
      explosionCount++; // Increment explosion counter
      console.log(`LinkExploder: Found post ${index + 1} containing "${matchedKeyword}" (explosion ${explosionCount}/${MAX_EXPLOSIONS_PER_SCAN}):`, post);
      
      // Mark as processed immediately to prevent reprocessing
      post.classList.add('keyword-processed');
      
      // Add special class for keyword type
      if (matchedKeyword.includes('💸')) {
        post.classList.add('money-target');
      } else if (matchedKeyword.includes('🛑')) {
        post.classList.add('stop-target');
      } else if (matchedKeyword.includes('🚀')) {
        post.classList.add('rocket-target');
      } else if (matchedKeyword === '#hashtag') {
        post.classList.add('hashtag-target');
      }
      
      // Highlight the keyword first (if it's text, not emoji)
      highlightKeywordInPost(post, matchedKeyword);
      
      // Get post dimensions for explosion center
      const rect = post.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Only explode if the post is visible on screen
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        // Create shooting effect from bottom right corner to post center
        setTimeout(() => {
          createShootingEffect(window.innerWidth - 50, window.innerHeight - 50, centerX, centerY);
        }, 500 + (index * 100)); // Stagger explosions to avoid overwhelming
        
        // Add explosion after highlighting and shooting
        setTimeout(() => {
          createExplosion(post, centerX, centerY, matchedKeyword);
        }, 750 + (index * 100)); // Stagger explosions
      }
    }
  });
}

// Function to validate if an element is actually a post
function isValidPost(element) {
  // Check if it has post-like characteristics
  const hasPostContent = element.querySelector('.update-components-text, .feed-shared-text, .attributed-text-segment-list__content');
  const hasAuthor = element.querySelector('.update-components-actor, .feed-shared-actor');
  const hasMinimumHeight = element.offsetHeight > 50;
  const hasActivity = element.hasAttribute('data-urn') && element.getAttribute('data-urn').includes('activity');
  
  return (hasPostContent || hasAuthor) && hasMinimumHeight && hasActivity;
}

// Function to continuously monitor for new posts
const monitorPosts = debounce(() => {
  if (extensionContextValid) {
    searchHighlightAndExplode();
  }
}, 200);

// Initial search when page loads
setTimeout(() => {
  if (!checkExtensionContext()) {
    console.warn('LinkExploder: Extension context invalidated during startup');
    return;
  }
  
  console.log('LinkExploder: Starting multi-keyword search...');
  console.log('Target keywords:', TARGET_KEYWORDS);
  console.log('Hashtag trigger enabled:', HASHTAG_TRIGGER);
  searchHighlightAndExplode();
}, 2000);

// Monitor for new content with debounce
const observer = new MutationObserver(debounce((mutations) => {
  if (!extensionContextValid) {
    console.warn('LinkExploder: Stopping mutation observer - extension context invalidated');
    observer.disconnect();
    return;
  }
  
  let hasNewNodes = false;
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      hasNewNodes = true;
      break;
    }
  }
  if (hasNewNodes) {
    monitorPosts();
  }
}, 300));

if (extensionContextValid && checkExtensionContext()) {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also run periodic checks every few seconds for dynamic content
  const periodicCheck = setInterval(() => {
    if (!extensionContextValid || !checkExtensionContext()) {
      console.warn('LinkExploder: Stopping periodic checks - extension context invalidated');
      clearInterval(periodicCheck);
      return;
    }
    monitorPosts();
  }, 3000);
}

console.log('LinkExploder: Extension loaded with multi-keyword support!');
console.log('Watching for:', TARGET_KEYWORDS, '+ hashtags (5+ threshold)');

// Configuration functions for users
window.configureLinkExploder = function(options = {}) {
  if (options.hashtagThreshold !== undefined) {
    CONFIG.hashtagThreshold = options.hashtagThreshold;
    console.log(`LinkExploder: Hashtag threshold set to ${CONFIG.hashtagThreshold}`);
  }
  
  if (options.enableHashtags !== undefined) {
    CONFIG.enableHashtagDetection = options.enableHashtags;
    console.log(`LinkExploder: Hashtag detection ${CONFIG.enableHashtagDetection ? 'enabled' : 'disabled'}`);
  }
  
  if (options.maxExplosions !== undefined) {
    CONFIG.maxExplosionsPerScan = options.maxExplosions;
    console.log(`LinkExploder: Max explosions per scan set to ${CONFIG.maxExplosionsPerScan}`);
  }
  
  if (options.debugMode !== undefined) {
    CONFIG.debugMode = options.debugMode;
    console.log(`LinkExploder: Debug mode ${CONFIG.debugMode ? 'enabled' : 'disabled'}`);
  }
  
  console.log('Current configuration:', CONFIG);
};

// Manual audio test function for debugging
window.testLinkExploderAudio = function() {
  if (!checkExtensionContext()) {
    console.log('❌ Extension context invalidated. Please refresh the page and reload the extension.');
    return;
  }
  
  console.log('LinkExploder Audio Test:');
  console.log('- Extension Context Valid:', extensionContextValid);
  console.log('- Audio Ready:', audioReady);
  console.log('- Audio Object:', explosionAudio);
  
  if (explosionAudio) {
    console.log('- Audio Source:', explosionAudio.src);
    console.log('- Audio Volume:', explosionAudio.volume);
    console.log('- Audio Ready State:', explosionAudio.readyState);
  }
  
  if (audioReady && explosionAudio) {
    explosionAudio.currentTime = 0;
    explosionAudio.play().then(() => {
      console.log('✅ Audio test successful!');
    }).catch(error => {
      console.log('❌ Audio test failed:', error);
    });
  } else {
    console.log('❌ Audio not ready. Attempting to reinitialize...');
    initializeAudio();
    setTimeout(() => {
      if (audioReady && explosionAudio) {
        explosionAudio.play().then(() => {
          console.log('✅ Audio test successful after reinit!');
        }).catch(error => {
          console.log('❌ Audio test still failed:', error);
        });
      }
    }, 1000);
  }
};

console.log('LinkExploder: Type configureLinkExploder({hashtagThreshold: 3}) to change settings');
console.log('LinkExploder: Type testLinkExploderAudio() to test audio manually');
