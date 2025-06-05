# 🎯 LinkExploder - Multi-Target Hunter

A Chrome extension that automatically detects LinkedIn posts containing specific trigger keywords, emojis, and hashtags, then creates spectacular explosion effects with unique visual themes for each target type!

## 🚀 Features

- **Multi-Keyword Detection**: Scans for multiple trigger phrases and keywords
- **Emoji Targeting**: Detects money (💸), stop (🛑), and rocket (🚀) emojis
- **Hashtag Hunter**: Automatically targets any post containing hashtags (#)
- **Dynamic Visual Themes**: Each keyword type has unique explosion colors and effects
- **Smart Targeting Indicators**: Different emojis mark different target types
- **Enhanced Explosion Effects**: Color-coded particle systems based on target type
- **Real-time Monitoring**: Continuously scans for new posts as they load

## 🎮 Target List

### Text Keywords
- **"changed the game"** - Classic game-changer posts
- **"changed the ai game"** - AI revolution posts  
- **"that changed everything"** - Transformation stories

### Emojis
- **💸** - Money/financial posts (Green explosion theme)
- **🛑** - Stop/warning posts (Red explosion theme)
- **🚀** - Rocket/growth posts (Blue explosion theme)

### Special Triggers
- **# (Hashtags)** - Any post containing hashtags (Purple explosion theme)

## 🎨 Visual Themes

### 💰 Money Targets (💸)
- **Indicator**: 💰 (spinning gold coin)
- **Colors**: Green explosion with money-themed particles
- **Particle Count**: 60 (extra abundance!)
- **Border**: Glowing green

### ⚠️ Stop Targets (🛑)
- **Indicator**: ⚠️ (warning symbol)
- **Colors**: Red explosion with warning-themed particles
- **Particle Count**: 40 (sharp and direct)
- **Border**: Glowing red

### 🌟 Rocket Targets (🚀)
- **Indicator**: 🌟 (bouncing star)
- **Colors**: Blue explosion with space-themed particles
- **Particle Count**: 70 (explosive growth!)
- **Border**: Glowing blue

### #️⃣ Hashtag Targets (#)
- **Indicator**: #️⃣ (hashtag symbol)
- **Colors**: Purple explosion with social-themed particles
- **Particle Count**: 45 (balanced reach)
- **Border**: Glowing purple

## 🎯 How It Works

1. Extension loads and monitors LinkedIn feed continuously
2. Scans all post text for trigger keywords, emojis, and hashtags
3. When a target is found:
   - Applies appropriate targeting indicator and border color
   - Highlights text keywords with animated glow
   - Shows visual targeting indicator (💰⚠️🌟#️⃣)
   - Fires themed bullet from corner to post center
   - Creates explosion with target-specific colors and particle count
   - Removes post from feed

## 📦 Installation

1. Download or clone this repository from [GitHub](https://github.com/marceloacosta/linkleaner.git)
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. Navigate to LinkedIn and watch the multi-target mayhem!

## 🔧 Configuration

You can modify the target list by editing the `TARGET_KEYWORDS` array in `content.js`:

```javascript
const TARGET_KEYWORDS = [
  "changed the game",
  "changed the ai game", 
  "that changed everything",
  "💸",
  "🛑", 
  "🚀"
];

// Toggle hashtag detection
const HASHTAG_TRIGGER = true;
```

## 🎨 Technical Features

- **Manifest Version**: 3
- **Smart Detection**: Case-insensitive text matching, exact emoji matching
- **Performance Optimized**: Debounced DOM queries and efficient text searching
- **Memory Management**: Automatic cleanup of visual effects
- **Color-Coded System**: Unique particle themes for each target type
- **Enhanced Audio**: Explosion sounds at optimal volume levels

## 📁 Backup System

All original files are safely backed up in the `backup/` folder and excluded from version control.

## 🔄 Version History

- **v2.1**: Multi-keyword and emoji detection with themed explosions
- **v2.0**: Single keyword search functionality  
- **v1.0**: Original profile blocking functionality (backed up)

## 🎪 Fun Statistics

The extension creates different explosion experiences:
- **💸 Posts**: 60 green particles for maximum money vibes
- **🛑 Posts**: 40 red particles for sharp warning impact
- **🚀 Posts**: 70 blue particles for explosive growth energy
- **#️⃣ Posts**: 45 purple particles for balanced social reach
- **Text Keywords**: 50 mixed-color particles for classic explosions

## 🤝 Contributing

Feel free to fork this repository and add your own target keywords or visual themes!

## ⚠️ Disclaimer

This extension is for entertainment purposes. Use responsibly and respect LinkedIn's terms of service. The extension processes content locally and does not collect or transmit any user data. 