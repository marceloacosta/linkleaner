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

function initializeAudio() {
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
    console.error('LinkExploder: Audio initialization failed:', error);
    audioReady = false;
  }
}

// Initialize audio when extension loads
initializeAudio();

// Target keywords and emojis that trigger explosions
const TARGET_KEYWORDS = [
  "changed the game",
  "changed the ai game", 
  "that changed everything",
  "💸",
  "🛑", 
  "🚀"
];

// Special hashtag detection - any hashtag with # symbol
const HASHTAG_TRIGGER = true; // Set to true to explode posts with hashtags

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
            explosionAudio.play().then(() => {
              console.log('LinkExploder: Audio enabled after user interaction');
            }).catch(e => console.warn('LinkExploder: Audio still failed:', e));
            document.removeEventListener('click', enableAudio);
          };
          
          document.addEventListener('click', enableAudio, { once: true });
        });
      }
    } catch (audioError) {
      console.error('LinkExploder: Audio playback failed:', audioError);
    }
  } else {
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
  
  // Check for hashtags if enabled
  if (HASHTAG_TRIGGER && postText.includes('#')) {
    return '#hashtag';
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
  const posts = document.querySelectorAll([
    '.feed-shared-update-v2',
    '.occludable-update',
    '.relative',
    '.artdeco-card',
    '[data-id^="urn:li:activity"]',
    '[data-urn^="urn:li:activity"]'
  ].join(', '));
  
  posts.forEach(post => {
    // Skip if already processed
    if (post.classList.contains('exploded') || 
        post.classList.contains('fade-explode') || 
        post.classList.contains('keyword-processed')) {
      return;
    }
    
    // Get all text content from the post
    const postText = post.textContent;
    
    // Check if the post contains any target keywords
    const matchedKeyword = checkForTargetKeywords(postText);
    
    if (matchedKeyword) {
      console.log(`LinkExploder: Found post containing "${matchedKeyword}":`, post);
      
      // Mark as processed
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
      
      // Create shooting effect from bottom right corner to post center
      setTimeout(() => {
        createShootingEffect(window.innerWidth - 50, window.innerHeight - 50, centerX, centerY);
      }, 500); // Small delay to show highlight first
      
      // Add explosion after highlighting and shooting
      setTimeout(() => {
        createExplosion(post, centerX, centerY, matchedKeyword);
      }, 750);
    }
  });
}

// Function to continuously monitor for new posts
const monitorPosts = debounce(() => {
  searchHighlightAndExplode();
}, 200);

// Initial search when page loads
setTimeout(() => {
  console.log('LinkExploder: Starting multi-keyword search...');
  console.log('Target keywords:', TARGET_KEYWORDS);
  console.log('Hashtag trigger enabled:', HASHTAG_TRIGGER);
  searchHighlightAndExplode();
}, 2000);

// Monitor for new content with debounce
const observer = new MutationObserver(debounce((mutations) => {
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

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Also run periodic checks every few seconds for dynamic content
setInterval(() => {
  monitorPosts();
}, 3000);

console.log('LinkExploder: Extension loaded with multi-keyword support!');
console.log('Watching for:', TARGET_KEYWORDS, '+ hashtags');

// Manual audio test function for debugging
window.testLinkExploderAudio = function() {
  console.log('LinkExploder Audio Test:');
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

console.log('LinkExploder: Type testLinkExploderAudio() in console to test audio manually');
