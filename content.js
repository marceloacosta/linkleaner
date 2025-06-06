console.log('🔥 LinkExploder content script loading...');

// LinkExploder – AI-Powered LinkedIn Post Hunter v3.3
// Enhanced context validation to prevent chrome-extension://invalid errors
// Uses OpenAI GPT-3.5-turbo for classification (handled in background.js)

/*
 * Debug functions available in console - defined early
 */
window.debugLinkExploderContext = function() {
  console.log('=== LinkExploder Context Debug ===');
  console.log('Extension context valid:', inExtensionContext());
  console.log('Can make runtime calls:', canMakeRuntimeCalls());
  console.log('Extension invalidated flag:', extensionInvalidated);
  console.log('Active requests:', activeRequests);
  console.log('Cache size:', cache.size);
  console.log('Chrome runtime ID:', chrome?.runtime?.id || 'Not available');
  
  if (chrome?.runtime?.getURL) {
    try {
      const testUrl = chrome.runtime.getURL('manifest.json');
      console.log('Test URL:', testUrl);
      console.log('URL valid:', !testUrl.includes('chrome-extension://invalid'));
    } catch (e) {
      console.log('Error testing URL:', e.message);
    }
  }
  
  console.log('Observers initialized:', !!(IO && MO));
  console.log('Posts found:', document.querySelectorAll(CONFIG.postSelectors.join(',')).length);
};

window.enableLinkExploderDebug = function() {
  CONFIG.debugMode = true;
  console.log('LinkExploder debug mode enabled');
};

window.testLinkExploderClassification = function() {
  if (!inExtensionContext()) {
    console.error('Extension context is invalid. Cannot test summary generation.');
    return;
  }
  
  console.log('Testing AI summary generation with sample text...');
  const testText = "I'm humbled to announce that after 15 years of grinding, I've finally been promoted to Senior Vice President of Digital Innovation at MegaCorp! This wouldn't have been possible without my amazing team and all the lessons I've learned from failure. Remember, success is 99% perspiration and 1% inspiration. What's your biggest career breakthrough? Let me know in the comments! #hustle #grateful #leadership";
  
  chrome.runtime.sendMessage({ type: 'generateSummary', text: testText }, (res) => {
    if (chrome.runtime.lastError) {
      console.error('Summary generation test failed:', chrome.runtime.lastError.message);
    } else {
      console.log('Summary generation result:', res);
      console.log('Generated summary:', res?.summary);
    }
  });
};

console.log('🔧 Debug functions loaded early');

/* ----------------------------------------
 * 1 · Configuration
 * ------------------------------------- */
const CONFIG = {
  debugMode: false,              // Heavy logging OFF by default – enable from dev-console if needed
  maxConcurrent: 3,              // Parallel classify() calls allowed
  minChars: 30,                  // Skip tiny blurbs (re-shares, ads, etc.)
  ioThreshold: 0.25,             // How much of the post must be on-screen before we analyse it
  selectors: [                   // Main containers that MutationObserver watches for new posts
    '#main',
    'div.core-rail',
    '.scaffold-finite-scroll',
    '.feed-container'
  ],
  postSelectors: [               // A single, unified list of things that look like a post
    'article.main-feed-activity-card',              // New LinkedIn feed cards
    '[data-urn*="activity"]',
    '.occludable-update',
    '.feed-shared-update-v2',
    '[data-id*="urn:li:activity"]'
  ]
};

console.log('🔧 LinkExploder CONFIG loaded:', CONFIG);

/* ----------------------------------------
 * 2 · Internal helpers
 * ------------------------------------- */
const _d = (...args) => CONFIG.debugMode && console.debug('[LinkExploder]', ...args);

function hash(str) {              // Tiny, quick hash so we can cache classifications in-tab
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return h >>> 0; // unsigned
}

// Enhanced extension context validation
function inExtensionContext() {
  try { 
    // Check if chrome runtime exists and has a valid ID
    if (!chrome?.runtime?.id) return false;
    
    // Additional check: try to access runtime URL to ensure context is valid
    if (chrome.runtime.getURL && typeof chrome.runtime.getURL === 'function') {
      const testUrl = chrome.runtime.getURL('manifest.json');
      if (!testUrl || testUrl.includes('chrome-extension://invalid')) return false;
    }
    
    return true;
  }
  catch (error) { 
    _d('Extension context check failed:', error.message);
    return false; 
  }
}

// Check if we can safely make runtime calls
function canMakeRuntimeCalls() {
  if (!inExtensionContext()) return false;
  
  try {
    // Test if we can access sendMessage function
    if (!chrome.runtime.sendMessage || typeof chrome.runtime.sendMessage !== 'function') {
      return false;
    }
    return true;
  } catch (error) {
    _d('Runtime calls check failed:', error.message);
    return false;
  }
}

/* ----------------------------------------
 * 3 · AI Classification plumbing
 * ------------------------------------- */
const cache = new Map();                 // text-hash ➞ label
let activeRequests = 0;                  // crude semaphore so we don't spam the API
let extensionInvalidated = false;        // Track if extension context was invalidated

async function classifyAndReplace(post) {
  // Early exit if extension context is invalid
  if (extensionInvalidated || !inExtensionContext()) {
    if (!extensionInvalidated) {
      extensionInvalidated = true;
      console.warn('[LinkExploder] Extension context invalidated. Attempting automatic recovery...');
      
      // Try to recover after a short delay
      setTimeout(() => {
        if (inExtensionContext()) {
          console.log('[LinkExploder] Extension context recovered! Resuming operation.');
          extensionInvalidated = false;
          // Reinitialize observers
          initializeObservers();
        } else {
          console.warn('[LinkExploder] Could not recover extension context. Please refresh the page to continue using the extension.');
        }
      }, 2000);
    }
    return;
  }

  if (post.dataset.leProcessed) return;   // already handled
  post.dataset.leProcessed = '1';

  // Extract actual post content text, excluding LinkedIn metadata
  const text = extractPostContent(post);
  if (text.length < CONFIG.minChars) return; // too small

  const h = hash(text);
  const cached = cache.get(h);
  if (cached) return replaceWithSummary(post, cached, text);

  // Rate-limit concurrent requests
  if (activeRequests >= CONFIG.maxConcurrent) {
    // Re-queue once some other request finishes (simple back-off)
    setTimeout(() => delete post.dataset.leProcessed, 500);
    return;
  }

  // Double-check before making runtime call
  if (!canMakeRuntimeCalls()) {
    _d('Cannot make runtime calls, skipping classification');
    return;
  }

  activeRequests++;
  _d('Generating summary…', text.slice(0, 120));

  try {
    chrome.runtime.sendMessage({ type: 'generateSummary', text }, (res) => {
      activeRequests--;
      
      // Check for runtime errors
      if (chrome.runtime.lastError) {
        _d('Runtime error:', chrome.runtime.lastError.message);
        if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
          extensionInvalidated = true;
          console.warn('[LinkExploder] Extension context invalidated during API call. Will attempt recovery.');
        }
        return;
      }
      
      const summary = res?.summary || '🤖 AI CONFUSED: Unable to analyze this post';
      console.log('🎯 Received AI summary:', summary);
      
      // If we got a config error, try to reload the service worker
      if (summary.includes('CONFIG ERROR') || summary.includes('Extension not properly configured')) {
        console.warn('🔄 Config error detected, attempting to reload service worker API key...');
        chrome.runtime.sendMessage({ type: 'reloadApiKey' }, (reloadRes) => {
          if (reloadRes && reloadRes.success) {
            console.log('✅ Service worker API key reloaded, retrying summary generation...');
            // Retry the summary generation
            setTimeout(() => {
              delete post.dataset.leProcessed;
              classifyAndReplace(post);
            }, 1000);
          } else {
            console.error('❌ Failed to reload service worker API key');
            cache.set(h, summary);
            replaceWithSummary(post, summary, text);
          }
        });
        return;
      }
      
      cache.set(h, summary);
      replaceWithSummary(post, summary, text);
    });
  } catch (e) {
    activeRequests--;
    _d('Message failed', e);
    
    // Check if this is a context invalidation error
    if (e.message && e.message.includes('Extension context invalidated')) {
      extensionInvalidated = true;
      console.warn('[LinkExploder] Extension context invalidated during message send. Will attempt recovery.');
    }
  }
}

function extractPostContent(post) {
  // Try to find the actual post content, excluding LinkedIn metadata
  const contentSelectors = [
    '.feed-shared-update-v2__description',
    '.update-components-text',
    '.feed-shared-text',
    '.update-components-update-v2__commentary',
    '.feed-shared-update-v2__commentary',
    '.update-components-text-view',
    '.feed-shared-text__text-view',
    '[data-test-id="main-feed-activity-card__commentary"]'
  ];
  
  let extractedText = '';
  
  // Try each content selector to find the main post text
  for (const selector of contentSelectors) {
    const contentElement = post.querySelector(selector);
    if (contentElement) {
      extractedText = contentElement.textContent.trim();
      if (extractedText.length > 20) {
        console.log('✅ Found post content using selector:', selector);
        break;
      }
    }
  }
  
  // Fallback: if no specific content found, try to get text but exclude common metadata
  if (!extractedText || extractedText.length < 20) {
    console.log('⚠️ Using fallback text extraction');
    const allText = post.textContent.trim();
    
    // Remove common LinkedIn metadata patterns
    extractedText = allText
      .replace(/^Feed post number \d+/i, '')  // Remove "Feed post number X"
      .replace(/^Post \d+/i, '')              // Remove "Post X"
      .replace(/^Activity \d+/i, '')          // Remove "Activity X"
      .replace(/^\d+ hours? ago/i, '')        // Remove timestamps at start
      .replace(/^\d+ minutes? ago/i, '')      // Remove timestamps at start
      .replace(/^Like Comment Share/i, '')    // Remove action buttons
      .replace(/^Comment Share/i, '')         // Remove action buttons
      .replace(/^Share/i, '')                 // Remove share button
      .replace(/\s+/g, ' ')                   // Normalize whitespace
      .trim();
  }
  
  // Additional cleanup
  extractedText = extractedText
    .replace(/^[•·]+\s*/, '')                 // Remove bullet points at start
    .replace(/^\W+/, '')                      // Remove non-word chars at start
    .trim();
  
  console.log('📝 Extracted text length:', extractedText.length);
  console.log('📝 Extracted text preview:', extractedText.slice(0, 100) + '...');
  
  return extractedText;
}

function replaceWithSummary(post, summary, originalText = null) {
  console.log('🎭 Creating AI-generated summary replacement:', summary);

  // Use the clean extracted text if provided, otherwise try to extract it
  const cleanOriginalText = originalText || extractPostContent(post);
  
  // Try to find and preserve the header (author info, date, etc.)
  let headerContent = null;
  let authorName = '';
  let postTime = '';
  let authorImage = null;

  // Better header extraction with multiple strategies for different post types
  console.log('🔍 Extracting header info from post...');
  
  // First, let's debug the post structure
  console.log('📊 Post DOM analysis:');
  console.log('- Post classes:', post.className);
  console.log('- Post data attributes:', Array.from(post.attributes).filter(attr => attr.name.startsWith('data-')).map(attr => `${attr.name}="${attr.value}"`));
  
  // Show all direct children and their classes
  const children = Array.from(post.children);
  console.log('- Direct children:', children.map(child => ({
    tag: child.tagName,
    classes: child.className,
    id: child.id
  })));
  
  // Look for any elements with "actor" in their class name
  const actorElements = post.querySelectorAll('[class*="actor"]');
  console.log('- Elements with "actor" in class:', actorElements.length);
  actorElements.forEach((el, i) => {
    console.log(`  Actor ${i + 1}:`, {
      tag: el.tagName,
      classes: el.className,
      text: el.textContent.trim().slice(0, 50) + '...',
      innerHTML: el.innerHTML.slice(0, 200) + '...',
      children: Array.from(el.children).map(child => ({
        tag: child.tagName,
        classes: child.className,
        text: child.textContent.trim().slice(0, 30)
      }))
    });
  });
  
  // Look for any links that might be profile links
  const profileLinks = post.querySelectorAll('a[href*="/in/"], a[href*="linkedin.com/in/"], a[href*="/company/"], a[href*="linkedin.com/company/"]');
  console.log('- Profile links found:', profileLinks.length);
  profileLinks.forEach((link, i) => {
    console.log(`  Link ${i + 1}:`, {
      href: link.href,
      text: link.textContent.trim(),
      classes: link.className,
      isCompany: link.href.includes('/company/')
    });
  });
  
  // Look for images
  const images = post.querySelectorAll('img');
  console.log('- Images found:', images.length);
  images.forEach((img, i) => {
    // Skip reaction button images (Like, Celebrate, etc.)
    const isReactionButton = ['Like', 'Celebrate', 'Support', 'Love', 'Insightful', 'Funny'].includes(img.alt);
    console.log(`  Image ${i + 1}:`, {
      src: img.src.slice(0, 100) + '...',
      alt: img.alt,
      classes: img.className,
      parentClasses: img.parentElement?.className,
      grandparentClasses: img.parentElement?.parentElement?.className,
      isReactionButton: isReactionButton
    });
  });
  
  // Look for time-related elements (including short formats like "12h", "3d", etc.)
  const timeElements = post.querySelectorAll('time, [class*="time"], [class*="ago"], .t-12');
  console.log('- Time elements found:', timeElements.length);
  timeElements.forEach((el, i) => {
    console.log(`  Time ${i + 1}:`, {
      tag: el.tagName,
      classes: el.className,
      text: el.textContent.trim()
    });
  });

  // Also look for ALL links in the post to see what we're missing
  const allLinks = post.querySelectorAll('a');
  console.log('- All links found:', allLinks.length);
  allLinks.forEach((link, i) => {
    if (i < 5) { // Only show first 5 to avoid spam
      console.log(`  All Link ${i + 1}:`, {
        href: link.href,
        text: link.textContent.trim().slice(0, 50),
        classes: link.className
      });
    }
  });

  // Look for any elements that might contain names (broader search)
  const potentialNameElements = post.querySelectorAll('span, div, a, h1, h2, h3, h4, h5, h6');
  const namesFound = [];
  potentialNameElements.forEach(el => {
    const text = el.textContent.trim();
    if (text.length > 3 && text.length < 50 && 
        text.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+/) && // Looks like "First Last"
        !text.includes('ago') && !text.includes('hour') && !text.includes('min') && 
        !text.includes('•') && !text.includes('LinkedIn')) {
      namesFound.push({
        text: text,
        tag: el.tagName,
        classes: el.className
      });
    }
  });
  console.log('- Potential names found by pattern matching:', namesFound);

  // Strategy 1: Look for author name in various locations
  const nameSelectors = [
    '.feed-shared-actor__name',
    '.update-components-actor__name', 
    '[data-test-id="actor-name"]',
    '.feed-shared-actor__container-link .visually-hidden',
    '.update-components-actor__container .visually-hidden',
    '.feed-shared-actor__container-link',
    '.update-components-actor__container',
    '.feed-shared-actor__title',
    '.update-components-actor__title',
    '.entity-ghost-team__content .visually-hidden',
    '.feed-shared-actor__description .visually-hidden',
    'a[data-test-id="actor-name"]',
    '.feed-shared-actor span[aria-hidden="true"]',
    '.update-components-actor span[aria-hidden="true"]'
  ];

  console.log('🔍 Testing name selectors...');
  for (const selector of nameSelectors) {
    const elements = post.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✓ Selector "${selector}" found ${elements.length} elements:`);
      elements.forEach((el, i) => {
        console.log(`  - Element ${i + 1}: "${el.textContent.trim()}"`);
      });
    }
    
    if (!authorName) {
      const nameEl = post.querySelector(selector);
      if (nameEl) {
        let name = nameEl.textContent.trim();
        // Clean up the name (remove common prefixes/suffixes)
        name = name
          .replace(/^View\s+/i, '')
          .replace(/\s+profile$/i, '')
          .replace(/^Connect with\s+/i, '')
          .replace(/\s+•.*$/, '')  // Remove everything after bullet point
          .replace(/\s+\d+[a-z]+\s*$/, '') // Remove ordinal numbers at end
          .trim();
        
        if (name.length > 2 && name.length < 100 && !name.match(/^\d+$/) && !name.includes('ago')) {
          authorName = name;
          console.log('✅ Found author name:', authorName, 'using selector:', selector);
          break;
        } else {
          console.log(`❌ Rejected name "${name}" (length: ${name.length}, invalid format)`);
        }
      }
    }
  }

  // Strategy 2: Look for post time/date
  const timeSelectors = [
    '.feed-shared-actor__sub-description',
    '.update-components-actor__sub-description',
    '.feed-shared-actor__description time',
    '.update-components-actor__description time',
    '.t-12',
    'time',
    '.feed-shared-actor__meta time',
    '.update-components-actor__meta time',
    '.feed-shared-actor__sub-description time',
    '.visually-hidden + .t-12',
    '.feed-shared-actor__description .t-12'
  ];

  console.log('🔍 Testing time selectors...');
  for (const selector of timeSelectors) {
    const elements = post.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✓ Time selector "${selector}" found ${elements.length} elements:`);
      elements.forEach((el, i) => {
        console.log(`  - Element ${i + 1}: "${el.textContent.trim()}"`);
      });
    }
    
    if (!postTime) {
      const timeEl = post.querySelector(selector);
      if (timeEl) {
        const timeText = timeEl.textContent.trim();
        // Handle both long formats ("3 hours ago") and short formats ("12h", "3d", "2w")
        if (timeText.includes('ago') || timeText.includes('hour') || timeText.includes('min') || timeText.includes('day') ||
            timeText.match(/^\d+[smhdw]$/)) { // Matches patterns like "12h", "3d", "2w", "45m", "30s"
          postTime = timeText;
          console.log('✅ Found post time:', postTime, 'using selector:', selector);
          break;
        }
      }
    }
  }

  // Strategy 3: Look for author image with more selectors
  const imageSelectors = [
    '.feed-shared-actor__avatar img',
    '.update-components-actor__avatar img',
    'img[alt*="photo"]',
    '.presence-entity__image',
    '.EntityPhoto',
    '.ivm-image-view-model img',
    '.feed-shared-actor img',
    '.update-components-actor img',
    '.feed-shared-actor__container img',
    '.update-components-actor__container img'
  ];

  console.log('🔍 Testing image selectors...');
  for (const selector of imageSelectors) {
    const elements = post.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✓ Image selector "${selector}" found ${elements.length} elements:`);
      elements.forEach((el, i) => {
        const isReactionButton = ['Like', 'Celebrate', 'Support', 'Love', 'Insightful', 'Funny'].includes(el.alt);
        console.log(`  - Image ${i + 1}:`, {
          src: el.src?.slice(0, 50) + '...',
          alt: el.alt,
          classes: el.className,
          isReactionButton: isReactionButton
        });
      });
    }
    
    if (!authorImage) {
      const imgEl = post.querySelector(selector);
      if (imgEl && imgEl.src && !imgEl.src.includes('data:')) {
        // Skip reaction button images
        const isReactionButton = ['Like', 'Celebrate', 'Support', 'Love', 'Insightful', 'Funny'].includes(imgEl.alt);
        if (!isReactionButton) {
          authorImage = imgEl.cloneNode(true);
          console.log('✅ Found author image using selector:', selector);
          break;
        }
      }
    }
  }

  // Strategy 4: Fallback - try to extract from link text or aria-labels
  if (!authorName) {
    console.log('⚠️ No author name found, trying fallback methods...');
    
    // Look for links that might contain author names (including company pages)
    const links = post.querySelectorAll('a[href*="/in/"], a[href*="/company/"]');
    console.log(`🔍 Found ${links.length} profile/company links for fallback analysis:`);
    for (const link of links) {
      const linkText = link.textContent.trim();
      const isCompany = link.href.includes('/company/');
      console.log(`- Link text: "${linkText}" (length: ${linkText.length}, isCompany: ${isCompany})`);
      if (linkText.length > 2 && linkText.length < 100 && !linkText.includes('ago') && !linkText.match(/^\d+$/)) {
        authorName = linkText.replace(/^View\s+/i, '').replace(/\s+profile$/i, '').trim();
        console.log('✅ Found author name from link:', authorName, isCompany ? '(Company)' : '(Person)');
        break;
      }
    }

    // Look for aria-labels that might contain author info
    if (!authorName) {
      const ariaElements = post.querySelectorAll('[aria-label*="profile"]');
      console.log(`🔍 Found ${ariaElements.length} elements with profile aria-labels:`);
      for (const el of ariaElements) {
        const ariaText = el.getAttribute('aria-label');
        console.log(`- Aria-label: "${ariaText}"`);
        const match = ariaText.match(/(.+?)'s?\s+profile/i);
        if (match && match[1]) {
          authorName = match[1].trim();
          console.log('✅ Found author name from aria-label:', authorName);
          break;
        }
      }
    }
  }

  // Strategy 5: Look harder for time info
  if (!postTime) {
    console.log('⚠️ No post time found, trying fallback methods...');
    
    // Look for any text that looks like a timestamp
    const allText = post.textContent;
    const timeMatches = allText.match(/(\d+\s*(?:second|minute|hour|day|week|month|year)s?\s*ago)/gi);
    if (timeMatches && timeMatches.length > 0) {
      console.log(`🔍 Found ${timeMatches.length} time patterns in text:`, timeMatches);
      postTime = timeMatches[0];
      console.log('✅ Found post time from text:', postTime);
    } else {
      console.log('❌ No time patterns found in post text');
    }
  }

  // Final summary
  console.log('📋 Header extraction summary:', {
    authorName: authorName || 'NOT FOUND',
    postTime: postTime || 'NOT FOUND', 
    hasImage: !!authorImage
  });

  // Create a clean header if we found any author info
  if (authorName || authorImage || postTime) {
    headerContent = document.createElement('div');
    headerContent.className = 'le-preserved-header';
    headerContent.style.cssText = `
      display: flex;
      align-items: center;
      padding: 10px 15px;
      border-bottom: 1px solid #e0e0e0;
      background: #fafbfc;
      font-size: 14px;
    `;

    if (authorImage) {
      const imgContainer = document.createElement('div');
      imgContainer.style.cssText = 'margin-right: 10px;';
      authorImage.style.cssText = 'width: 40px; height: 40px; border-radius: 50%; object-fit: cover;';
      imgContainer.appendChild(authorImage);
      headerContent.appendChild(imgContainer);
    }

    if (authorName || postTime) {
      const textContainer = document.createElement('div');
      if (authorName) {
        const nameDiv = document.createElement('div');
        nameDiv.style.cssText = 'font-weight: 600; color: #333; margin-bottom: 2px;';
        nameDiv.textContent = authorName;
        textContainer.appendChild(nameDiv);
      }
      if (postTime) {
        const timeDiv = document.createElement('div');
        timeDiv.style.cssText = 'font-size: 12px; color: #666;';
        timeDiv.textContent = postTime;
        textContainer.appendChild(timeDiv);
      }
      headerContent.appendChild(textContainer);
    }

    console.log('✅ Created header with:', { authorName, postTime, hasImage: !!authorImage });
  } else {
    console.log('❌ No header information found at all');
    
    // Last resort: create a minimal header indicating unknown author
    headerContent = document.createElement('div');
    headerContent.className = 'le-preserved-header';
    headerContent.style.cssText = `
      display: flex;
      align-items: center;
      padding: 10px 15px;
      border-bottom: 1px solid #e0e0e0;
      background: #fafbfc;
      font-size: 14px;
      color: #666;
      font-style: italic;
    `;
    headerContent.textContent = '👤 LinkedIn User';
    console.log('🔧 Created fallback header');
  }

  // Create the main container
  const container = document.createElement('div');
  container.className = 'le-post-container';
  container.style.cssText = `
    border: 2px solid #4a90e2;
    border-radius: 8px;
    overflow: hidden;
    background: white;
    margin: 10px 0;
    box-shadow: 0 2px 10px rgba(74, 144, 226, 0.2);
  `;

  // Add header if we have one
  if (headerContent) {
    container.appendChild(headerContent);
  }

  // Create the AI summary section
  const summarySection = document.createElement('div');
  summarySection.className = 'le-summary-section';
  summarySection.style.cssText = `
    padding: 15px;
    background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
    cursor: pointer;
    transition: all 0.3s ease;
  `;

  const summaryLabel = document.createElement('div');
  summaryLabel.style.cssText = `
    font-size: 11px;
    font-weight: 600;
    color: #4a90e2;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `;
  summaryLabel.textContent = '🤖 AI SUMMARY';

  const summaryText = document.createElement('div');
  summaryText.style.cssText = `
    font-size: 14px;
    font-weight: 600;
    color: #333;
    line-height: 1.4;
  `;
  summaryText.textContent = summary;

  const clickHint = document.createElement('div');
  clickHint.style.cssText = `
    font-size: 11px;
    color: #666;
    margin-top: 8px;
    font-style: italic;
  `;
  clickHint.textContent = 'Click to see original post';

  summarySection.appendChild(summaryLabel);
  summarySection.appendChild(summaryText);
  summarySection.appendChild(clickHint);

  container.appendChild(summarySection);

  // Add hover effects
  summarySection.addEventListener('mouseenter', () => {
    summarySection.style.transform = 'translateY(-2px)';
    summarySection.style.boxShadow = '0 4px 15px rgba(74, 144, 226, 0.3)';
  });

  summarySection.addEventListener('mouseleave', () => {
    summarySection.style.transform = 'translateY(0)';
    summarySection.style.boxShadow = 'none';
  });

  // Toggle functionality
  let isExpanded = false;
  summarySection.addEventListener('click', () => {
    if (!isExpanded) {
      // Show original post
      const originalSection = document.createElement('div');
      originalSection.className = 'le-original-section';
      originalSection.style.cssText = `
        padding: 15px;
        background: white;
        border-top: 1px solid #e0e0e0;
        max-height: 300px;
        overflow-y: auto;
      `;

      const originalLabel = document.createElement('div');
      originalLabel.style.cssText = `
        font-size: 11px;
        font-weight: 600;
        color: #666;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      `;
      originalLabel.textContent = '📄 ORIGINAL POST';

      const originalContent = document.createElement('div');
      originalContent.style.cssText = `
        font-size: 14px;
        color: #333;
        line-height: 1.5;
        white-space: pre-wrap;
      `;
      originalContent.textContent = cleanOriginalText;

      originalSection.appendChild(originalLabel);
      originalSection.appendChild(originalContent);
      container.appendChild(originalSection);

      clickHint.textContent = 'Click to hide original post';
      isExpanded = true;
    } else {
      // Hide original post
      const originalSection = container.querySelector('.le-original-section');
      if (originalSection) {
        originalSection.remove();
      }
      clickHint.textContent = 'Click to see original post';
      isExpanded = false;
    }
  });

  // Replace the post content
  post.innerHTML = '';
  post.appendChild(container);
  
  // Smooth animation
  requestAnimationFrame(() => { 
    container.style.opacity = '0'; 
    container.style.transform = 'translateY(-8px)'; 
  });
  setTimeout(() => {
    container.style.opacity = '1'; 
    container.style.transform = 'translateY(0)'; 
  }, 50);
}

/* ----------------------------------------
 * 4 · Observers (IO + Mutation)
 * ------------------------------------- */
let IO, MO; // Declare observers globally so we can clean them up

function initializeObservers() {
  try {
    console.log('🔧 initializeObservers() called');
    
    // Clean up existing observers
    if (IO) {
      console.log('🧹 Cleaning up existing IntersectionObserver');
      IO.disconnect();
    }
    if (MO) {
      console.log('🧹 Cleaning up existing MutationObserver');
      MO.disconnect();
    }
    
    // Only initialize if extension context is valid
    if (!inExtensionContext()) {
      console.warn('🚫 Skipping observer initialization - invalid extension context');
      return;
    }

    console.log('🔧 Creating new IntersectionObserver...');
    IO = new IntersectionObserver((entries) => {
      // Double-check context before processing entries
      if (extensionInvalidated || !inExtensionContext()) return;
      
      console.log(`👁️ IntersectionObserver triggered with ${entries.length} entries`);
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          console.log('👀 Post came into view, classifying...');
          classifyAndReplace(entry.target);
        }
      });
    }, { threshold: CONFIG.ioThreshold });
    console.log('✅ IntersectionObserver created');

    console.log('🔧 Creating new MutationObserver...');
    MO = new MutationObserver((muts) => {
      // Double-check context before processing mutations
      if (extensionInvalidated || !inExtensionContext()) return;
      
      console.log(`🧬 MutationObserver triggered with ${muts.length} mutations`);
      muts.forEach(m => m.addedNodes.forEach(scanNode));
    });
    console.log('✅ MutationObserver created');
    
  } catch (error) {
    console.error('❌ Observer initialization failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

function scanNode(node) {
  if (node.nodeType !== 1) return; // element only
  if (extensionInvalidated || !inExtensionContext()) return; // context check

  CONFIG.postSelectors.some(sel => {
    if (node.matches?.(sel)) { 
      if (IO) IO.observe(node); 
      return true; 
    }
    return false;
  });

  node.querySelectorAll?.(CONFIG.postSelectors.join(','))
      .forEach(el => {
        if (IO) IO.observe(el);
      });
}

/* ----------------------------------------
 * 5 · Bootstrap once DOM is ready
 * ------------------------------------- */
function start() {
  console.log('🚀 LinkExploder start() function called');
  
  try {
    if (!inExtensionContext()) { 
      console.warn('LinkExploder: not running inside extension context'); 
      return; 
    }
    console.log('✅ Extension context valid');

    // Initialize observers
    console.log('🔧 Initializing observers...');
    initializeObservers();
    console.log('✅ Observers initialized');
    
    // Set up mutation observers on main containers
    console.log('🔧 Setting up mutation observers...');
    CONFIG.selectors.forEach(sel => {
      const containers = document.querySelectorAll(sel);
      console.log(`Found ${containers.length} containers for selector: ${sel}`);
      containers.forEach(c => {
        if (MO) MO.observe(c, {childList:true,subtree:true});
      });
    });
    console.log('✅ Mutation observers set up');

    // Observe posts already in view at load
    console.log('🔧 Finding existing posts...');
    const existingPosts = document.querySelectorAll(CONFIG.postSelectors.join(','));
    console.log(`Found ${existingPosts.length} existing posts`);
    existingPosts.forEach(p => {
      if (IO) IO.observe(p);
    });
    console.log('✅ Existing posts observed');

    console.log('🎯 LinkExploder v3.3 initialized successfully with enhanced context validation');
  } catch (error) {
    console.error('❌ LinkExploder initialization failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Handle page visibility changes to detect context invalidation
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Re-check extension context when page becomes visible
    if (!inExtensionContext()) {
      extensionInvalidated = true;
      console.warn('[LinkExploder] Extension context invalidated. Please refresh the page to continue using the extension.');
    }
  }
});

// Clean up observers when extension context is invalidated
window.addEventListener('beforeunload', () => {
  if (IO) IO.disconnect();
  if (MO) MO.disconnect();
});

/* ----------------------------------------
 * 6 · DOM Ready Check
 * ------------------------------------- */
try {
  console.log('🔧 LinkExploder checking DOM readiness...');
  
  if (document.readyState === 'loading') {
    console.log('📄 Document still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('📄 DOMContentLoaded event fired');
      start();
    });
  } else {
    console.log('📄 Document already ready, starting immediately');
    start();
  }
  
  // Additionally start when page is fully loaded, in case we missed the event
  window.addEventListener('load', () => {
    console.log('🌐 Window load event fired');
    start();
  });
  
  console.log('✅ LinkExploder DOM ready check complete');
} catch (error) {
  console.error('❌ LinkExploder DOM initialization failed:', error);
  console.error('Stack trace:', error.stack);
}

/* ----------------------------------------
 * 7 · Health Check & Recovery
 * ------------------------------------- */
try {
  console.log('🔧 Setting up periodic health check...');
  
  // Periodic health check to detect and recover from context issues
  setInterval(() => {
    try {
      if (extensionInvalidated && inExtensionContext()) {
        console.log('🏥 Health check: Extension context recovered! Resuming operation.');
        extensionInvalidated = false;
        initializeObservers();
      } else if (!extensionInvalidated && !inExtensionContext()) {
        console.warn('🚨 Health check: Extension context lost. Attempting recovery...');
        extensionInvalidated = true;
      }
    } catch (error) {
      console.error('❌ Health check failed:', error);
    }
  }, 30000); // Check every 30 seconds
  
  console.log('✅ Health check initialized');
} catch (error) {
  console.error('❌ Health check setup failed:', error);
}

/* ----------------------------------------
 * 8 · Completion Log
 * ------------------------------------- */
console.log('🎯 LinkExploder content script fully loaded and ready!');

/* ----------------------------------------
 * 9 · Message Handlers for Popup
 * ------------------------------------- */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Content script received message:', message);
  
  if (message.type === 'ping') {
    sendResponse({ pong: true });
    return;
  }
  
  if (message.type === 'test') {
    // Run a quick test of the extension functionality
    const testResult = {
      success: true,
      message: 'Extension is running properly'
    };
    
    // Check if observers are initialized
    if (!IO || !MO) {
      testResult.success = false;
      testResult.error = 'Observers not initialized';
    }
    
    // Check extension context
    if (!inExtensionContext()) {
      testResult.success = false;
      testResult.error = 'Extension context invalid';
    }
    
    // Check if posts are found
    const posts = document.querySelectorAll(CONFIG.postSelectors.join(','));
    if (posts.length === 0) {
      testResult.success = false;
      testResult.error = 'No LinkedIn posts found on this page';
    } else {
      testResult.message = `Found ${posts.length} posts, extension ready to analyze`;
    }
    
    sendResponse(testResult);
    return;
  }
});

/*
 *  Docs & References
 *  – IntersectionObserver is efficient for in-viewport detection↗
 *    https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver
 *  – chrome.runtime.sendMessage is the correct async messaging mechanism↗
 *    https://developer.chrome.com/docs/extensions/reference/runtime/#method-sendMessage
 *  – Excessive console.log calls can noticeably hurt performance↗
 *    https://stackoverflow.com/questions/8336642/how-much-does-it-cost-in-terms-of-performance-to-use-console-log-in-nodejs-and-i
 */