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
function createExplosion(element, mouseX, mouseY) {
  if (!element) return;
  
  // Play explosion sound
  const explosionSound = new Audio(chrome.runtime.getURL('explosion.mp3'));
  explosionSound.volume = 0.4; // Set volume to 40%
  explosionSound.play();
  
  const explosionContainer = document.createElement('div');
  explosionContainer.className = 'explosion-container';
  explosionContainer.style.left = mouseX + 'px';
  explosionContainer.style.top = mouseY + 'px';
  
  // Create more particles with varied colors
  const particleCount = 40;
  const colors = ['#ff4444', '#ffaa00', '#ff8800', '#ffcc00', '#ff0000'];
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Randomly assign colors
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.left = '0px';
    particle.style.top = '0px';
    
    // Create more dynamic movement
    const angle = (Math.random() * 360) * (Math.PI / 180);
    const velocity = 150 + Math.random() * 250; // Increased velocity range
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
  }, 800); // Increased duration for longer effect
}

// Function to handle profile blocking
async function blockProfile(event) {
  const mouseX = event.clientX;
  const mouseY = event.clientY;
  
  event.preventDefault();
  event.stopPropagation();
  
  let profileLink = event.target;
  if (!profileLink.href) {
    profileLink = event.target.closest('a[href*="/in/"]');
  }
  
  if (!profileLink || !profileLink.href) {
    console.log('No profile link found');
    return;
  }

  const postElement = findPostContainer(profileLink);
  if (!postElement) {
    console.log('No post container found');
    return;
  }
  
  const profileUrl = profileLink.href;
  const profileId = profileUrl.split('/in/')[1]?.split(/[/?#]/)[0];
  
  if (!profileId) {
    console.log('Could not extract profile ID from URL:', profileUrl);
    return;
  }
  
  console.log('Attempting to block profile:', profileId);
  
  createShootingEffect(window.innerWidth - 50, window.innerHeight - 50, mouseX, mouseY);
  
  setTimeout(() => {
    createExplosion(postElement, mouseX, mouseY);
  }, 200);
  
  const blocked = await blockProfileOnLinkedIn(profileId);
  
  if (blocked) {
    chrome.storage.local.get(['blockedProfiles'], function(result) {
      const blockedProfiles = result.blockedProfiles || [];
      if (!blockedProfiles.includes(profileId)) {
        blockedProfiles.push(profileId);
        chrome.storage.local.set({ blockedProfiles: blockedProfiles }, () => {
          console.log('Profile stored in extension storage:', profileId);
          hideBlockedProfilePosts();
        });
      }
    });
  }
}

// Function to hide posts from blocked profiles
const hideBlockedProfilePosts = debounce(() => {
  chrome.storage.local.get(['blockedProfiles'], function(result) {
    const blockedProfiles = result.blockedProfiles || [];
    if (blockedProfiles.length === 0) return;

    const profileLinks = document.querySelectorAll('a[href*="/in/"]');
    profileLinks.forEach(link => {
      const profileId = link.href.split('/in/')[1]?.split(/[/?#]/)[0];
      if (profileId && blockedProfiles.includes(profileId)) {
        const postElement = findPostContainer(link);
        if (postElement && !postElement.classList.contains('fade-explode')) {
          const rect = postElement.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          
          createShootingEffect(window.innerWidth - 50, window.innerHeight - 50, centerX, centerY);
          setTimeout(() => {
            createExplosion(postElement, centerX, centerY);
          }, 200);
        }
      }
    });
  });
}, 100);

// Function to find the closest post container
function findPostContainer(element) {
  const postSelectors = [
    '.feed-shared-update-v2',
    '.occludable-update',
    '.relative',
    '.artdeco-card',
    '[data-id^="urn:li:activity"]',
    '[data-urn^="urn:li:activity"]'
  ];
  
  for (const selector of postSelectors) {
    const container = element.closest(selector);
    if (container) return container;
  }
  
  return null;
}

// Function to block profile on LinkedIn
async function blockProfileOnLinkedIn(profileId) {
  try {
    // Get the member ID from the profile URL
    const response = await fetch(`https://www.linkedin.com/in/${profileId}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }
    
    const html = await response.text();
    const entityUrn = html.match(/"entityUrn":"([^"]+)"/)?.[1];
    
    if (!entityUrn) {
      throw new Error('Could not find entity URN');
    }
    
    // Extract member ID from entityUrn
    const memberId = entityUrn.split(':').pop();
    console.log('Found member ID:', memberId);

    // Get the API version and CSRF token from the page
    const apiVersion = document.body.getAttribute('data-api-version') || '1.0.0';
    const csrfToken = document.body.getAttribute('data-csrf-token') || '';
    
    // Make the block request
    const blockResponse = await fetch('https://www.linkedin.com/litms/api/social/block-members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        'x-li-api-version': apiVersion,
        'x-restli-protocol-version': '2.0.0'
      },
      body: JSON.stringify({
        memberIdUrn: `urn:li:member:${memberId}`,
        action: 'BLOCK'
      }),
      credentials: 'include'
    });

    if (!blockResponse.ok) {
      throw new Error(`Block request failed: ${blockResponse.status}`);
    }

    console.log('Successfully blocked profile:', profileId);
    return true;
  } catch (error) {
    console.error('Error blocking profile:', error);
    return false;
  }
}

// Add click listeners to profile links
function addProfileListeners() {
  document.querySelectorAll('a[href*="/in/"]').forEach(link => {
    const clone = link.cloneNode(true);
    link.parentNode.replaceChild(clone, link);
    clone.addEventListener('click', blockProfile, { capture: true, once: true });
  });
}

// Initial setup
addProfileListeners();
hideBlockedProfilePosts();

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
    addProfileListeners();
  }
}, 100));

observer.observe(document.body, {
  childList: true,
  subtree: true
});
