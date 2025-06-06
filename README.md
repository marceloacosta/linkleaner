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

## Technical Architecture

### Content Detection
- Uses multiple CSS selectors to identify LinkedIn posts across different layouts
- Employs MutationObserver to watch for dynamically added content
- IntersectionObserver triggers analysis only when posts are visible

### AI Integration
- Background script handles OpenAI API communication
- Secure API key management through Chrome extension storage
- Rate limiting and error handling for API requests
- Fallback messaging for failed classifications

### Context Management
- Validates Chrome extension context before operations
- Handles extension invalidation scenarios
- Automatic observer reinitialization when context recovers

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

## Debug Functions

The extension includes several debug functions accessible from the browser console:

- `window.debugLinkExploderContext()` - Display extension context information
- `window.enableLinkExploderDebug()` - Enable debug logging
- `window.testLinkExploderClassification()` - Test AI summarization with sample text

## File Structure

- `content.js` - Main content script handling post detection and replacement
- `background.js` - Service worker managing API communication
- `popup.html/js/css` - Extension configuration interface
- `manifest.json` - Extension configuration and permissions

## Privacy and Security

- All post analysis occurs through secure API calls to OpenAI
- No user data is stored permanently by the extension
- API keys are stored securely using Chrome extension storage APIs
- The extension only processes visible LinkedIn content

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