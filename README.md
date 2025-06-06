# LinkExploder - AI-Powered LinkedIn Post Analyzer

A Chrome extension that automatically analyzes LinkedIn posts using artificial intelligence and replaces them with concise summaries, helping users quickly understand post content without reading through lengthy text.

## Features

### AI-Powered Analysis
- Uses OpenAI GPT-4o-mini to analyze and summarize LinkedIn posts
- Generates intelligent summaries that capture the key points of each post
- Processes posts automatically as they appear in your LinkedIn feed

### Smart Post Detection
- Monitors LinkedIn feed using IntersectionObserver for efficient performance
- Automatically detects new posts as they load
- Supports various LinkedIn post formats and layouts

### Enhanced User Experience
- Replaces original posts with clean, summarized versions
- Preserves essential post metadata (author name, profile image, timestamp)
- Click-to-expand functionality to view original post content when needed
- Smooth animations and transitions for better visual experience

### Performance Optimization
- Concurrent request limiting to prevent API overuse
- Text caching to avoid re-analyzing identical content
- Debounced DOM operations for optimal performance
- Memory-efficient cleanup of observers and event listeners

### Robust Error Handling
- Extension context validation to prevent runtime errors
- Automatic recovery from context invalidation
- Health monitoring with periodic context checks
- Graceful fallbacks when AI analysis fails

## Installation Guide for Non-Technical Users

### Step 1: Download the Extension
1. Click the green "Code" button on this GitHub page
2. Select "Download ZIP" from the dropdown menu
3. Save the ZIP file to your computer (remember where you saved it)
4. Extract/unzip the downloaded file to create a folder

### Step 2: Open Chrome Extensions Page
1. Open Google Chrome browser
2. Type `chrome://extensions/` in the address bar and press Enter
3. Alternatively, you can:
   - Click the three dots menu in the top-right corner of Chrome
   - Go to "More tools" → "Extensions"

### Step 3: Enable Developer Mode
1. On the Extensions page, look for "Developer mode" in the top-right corner
2. Click the toggle switch to turn on "Developer mode"
3. You should now see additional buttons appear

### Step 4: Load the Extension
1. Click the "Load unpacked" button (it appears after enabling Developer mode)
2. Navigate to the folder you extracted in Step 1
3. Select the folder and click "Select Folder" or "Open"
4. The extension should now appear in your extensions list

### Step 5: Get Your OpenAI API Key
1. Go to [OpenAI's website](https://platform.openai.com/api-keys)
2. Sign up for an account if you don't have one
3. Create a new API key
4. Copy the API key (you'll need it in the next step)

### Step 6: Configure the Extension
1. Click on the extension icon in your Chrome toolbar (it may be in the puzzle piece menu)
2. Click "Options" or go to the extension settings
3. Paste your OpenAI API key in the provided field
4. Save the settings

### Step 7: Start Using the Extension
1. Go to LinkedIn.com
2. Browse your feed normally
3. The extension will automatically start analyzing and summarizing posts
4. Click on summaries to expand and see the original post content

### Troubleshooting
- If you don't see the extension icon, check if it's hidden in the extensions menu (puzzle piece icon)
- If posts aren't being summarized, check your API key configuration
- Make sure you have an active internet connection
- Refresh the LinkedIn page if the extension isn't working

## Important Cost Warning

**This extension makes multiple API calls to OpenAI and will incur charges to your OpenAI account.**

- Each LinkedIn post that gets analyzed results in one API call to OpenAI GPT-4o-mini
- Costs accumulate based on your LinkedIn usage and the number of posts processed
- A typical LinkedIn browsing session may process dozens of posts
- You are responsible for monitoring and managing your OpenAI usage and costs
- Consider setting usage limits in your OpenAI account to control expenses
- The extension does not include any cost controls or usage limits

**Use this extension at your own responsibility and monitor your OpenAI billing regularly.**

## How It Works

### Architecture Overview

The extension operates using a three-component architecture:

1. **Content Script** (`content.js`) - Runs on LinkedIn pages to detect and process posts
2. **Service Worker** (`worker.js`) - Handles OpenAI API communication in the background
3. **User Interface** (`popup.html/js`, `options.html/js`) - Provides configuration interface

### Content Script Operation

The content script implements several key mechanisms:

**Post Detection**
- Uses `MutationObserver` to watch for new posts added to the DOM
- Employs `IntersectionObserver` to trigger analysis only when posts become visible
- Supports multiple CSS selectors to handle different LinkedIn post layouts
- Implements debouncing to prevent excessive processing

**Text Extraction**
- Extracts post content while filtering out LinkedIn UI elements
- Removes metadata like timestamps, action buttons, and navigation elements
- Handles various post formats including text-only, image posts, and shared content
- Applies minimum character threshold to avoid processing trivial content

**Post Replacement**
- Preserves original post metadata (author, image, timestamp)
- Creates custom UI components with summary and original content toggle
- Implements smooth animations for visual transitions
- Maintains accessibility features and proper DOM structure

### Service Worker Integration

The service worker (`worker.js`) manages all AI processing:

**API Management**
- Handles OpenAI GPT-4o-mini API requests with proper authentication
- Implements retry logic with exponential backoff for failed requests
- Features circuit breaker pattern to prevent excessive API calls during outages
- Manages request timeouts and rate limiting

**Error Handling**
- Distinguishes between different types of API errors (rate limits, server errors, authentication)
- Provides specific error messages for different failure scenarios
- Implements automatic recovery mechanisms for transient failures
- Logs detailed error information for debugging

**Performance Features**
- Limits concurrent API requests to prevent overwhelming the service
- Implements request queuing for high-volume scenarios
- Provides fallback responses when API is unavailable
- Monitors API usage patterns and adjusts behavior accordingly

### Configuration System

The extension provides multiple configuration interfaces:

**Options Page** (`options.html/js`)
- Comprehensive settings interface for advanced users
- API key management with secure storage
- Performance tuning parameters
- Debug mode controls and logging options

**Popup Interface** (`popup.html/js`)
- Quick access to basic settings
- Extension status monitoring
- Basic troubleshooting tools
- Direct links to full options page

## Technical Implementation

### DOM Monitoring

The extension uses efficient DOM monitoring strategies:

```javascript
// IntersectionObserver for visibility-based processing
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      processPost(entry.target);
    }
  });
}, { threshold: 0.25 });

// MutationObserver for dynamic content detection
const mutationObserver = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(scanForPosts);
  });
});
```

### API Integration

The service worker handles API communication with comprehensive error handling:

```javascript
// GPT-4o-mini integration with retry logic
async function generateSummary(text, retryCount = 0) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [...],
      max_tokens: 100,
      temperature: 0.8
    })
  });
}
```

### Context Management

The extension implements robust context validation:

- Validates Chrome extension context before operations
- Handles extension invalidation scenarios gracefully
- Implements automatic observer reinitialization
- Provides health monitoring with periodic context checks

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to chrome://extensions/
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. Configure your OpenAI API key in the extension popup
6. Visit LinkedIn to start using the extension

## Configuration

### API Key Setup
The extension requires an OpenAI API key to function. Configure it through the extension popup interface.

### Adjustable Parameters
You can modify these settings in the CONFIG object within content.js:

```javascript
const CONFIG = {
  debugMode: false,           // Enable detailed logging
  maxConcurrent: 3,          // Maximum simultaneous API requests
  minChars: 30,              // Minimum post length to analyze
  ioThreshold: 0.25          // Intersection threshold for post detection
};
```

## File Structure

- `content.js` - Main content script handling post detection and replacement
- `worker.js` - Service worker managing OpenAI API communication and error handling
- `popup.html/js/css` - Extension popup interface for basic configuration
- `options.html/js/css` - Comprehensive options page for advanced settings
- `manifest.json` - Extension configuration and permissions
- `styles.css` - Shared styling for extension components

## Debug Functions

The extension includes several debug functions accessible from the browser console:

- `window.debugLinkExploderContext()` - Display extension context information
- `window.enableLinkExploderDebug()` - Enable debug logging
- `window.testLinkExploderClassification()` - Test AI summarization with sample text

## Privacy and Security

- All post analysis occurs through secure API calls to OpenAI
- No user data is stored permanently by the extension
- API keys are stored securely using Chrome extension storage APIs
- The extension only processes visible LinkedIn content
- No tracking or analytics are implemented

## Browser Compatibility

- Chrome (Manifest V3)
- Chromium-based browsers with extension support

## Requirements

- Valid OpenAI API key
- Active internet connection for AI analysis
- LinkedIn access

## Troubleshooting

### Extension Not Working
1. Check that the extension context is valid using debug functions
2. Verify API key configuration in the popup
3. Refresh the LinkedIn page to reinitialize observers

### Posts Not Being Analyzed
1. Ensure posts meet minimum character requirements
2. Check browser console for error messages
3. Verify extension permissions are granted

### API Errors
1. Confirm OpenAI API key is valid and has sufficient credits
2. Check network connectivity
3. Review rate limiting settings if encountering frequent errors

## Contributing

Contributions are welcome. Please ensure any changes maintain the extension's privacy standards and performance characteristics.

## License

This project is provided as-is for educational and productivity purposes. Users are responsible for compliance with LinkedIn's terms of service and OpenAI's usage policies. 