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
function createExplosion(element, centerX, centerY) {
  if (!element || element.classList.contains('exploded')) return;
  
  // Mark as exploded to prevent multiple explosions
  element.classList.add('exploded');
  
  // Play explosion sound
  const explosionSound = new Audio(chrome.runtime.getURL('explosion.mp3'));
  explosionSound.volume = 0.4; // Set volume to 40%
  explosionSound.play();
  
  const explosionContainer = document.createElement('div');
  explosionContainer.className = 'explosion-container';
  explosionContainer.style.left = centerX + 'px';
  explosionContainer.style.top = centerY + 'px';
  
  // Create more particles with varied colors
  const particleCount = 50;
  const colors = ['#ff4444', '#ffaa00', '#ff8800', '#ffcc00', '#ff0000', '#ffff00'];
  
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

// Function to search for posts containing "changed the game"
function searchAndExplodePosts() {
  const targetKeyword = "changed the game";
  const posts = document.querySelectorAll([
    '.feed-shared-update-v2',
    '.occludable-update',
    '.relative',
    '.artdeco-card',
    '[data-id^="urn:li:activity"]',
    '[data-urn^="urn:li:activity"]'
  ].join(', '));
  
  posts.forEach(post => {
    // Skip if already exploded
    if (post.classList.contains('exploded') || post.classList.contains('fade-explode')) {
      return;
    }
    
    // Get all text content from the post
    const postText = post.textContent.toLowerCase();
    
    // Check if the post contains our target keyword
    if (postText.includes(targetKeyword.toLowerCase())) {
      console.log('Found post containing "changed the game":', post);
      
      // Get post dimensions for explosion center
      const rect = post.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Create shooting effect from bottom right corner to post center
      createShootingEffect(window.innerWidth - 50, window.innerHeight - 50, centerX, centerY);
      
      // Add a small delay before explosion
      setTimeout(() => {
        createExplosion(post, centerX, centerY);
      }, 250);
    }
  });
}

// Function to highlight the keyword in posts before exploding them
function highlightKeywordInPost(post, keyword) {
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

// Enhanced search function with keyword highlighting
function searchHighlightAndExplode() {
  const targetKeyword = "changed the game";
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
    const postText = post.textContent.toLowerCase();
    
    // Check if the post contains our target keyword
    if (postText.includes(targetKeyword.toLowerCase())) {
      console.log('Found post containing "changed the game":', post);
      
      // Mark as processed
      post.classList.add('keyword-processed');
      
      // Highlight the keyword first
      highlightKeywordInPost(post, targetKeyword);
      
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
        createExplosion(post, centerX, centerY);
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
  console.log('LinkExploder: Starting keyword search for "changed the game"');
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

console.log('LinkExploder: Extension loaded - searching for "changed the game" posts!');
