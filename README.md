# 🎯 LinkExploder - Game Changer Hunter

A Chrome extension that automatically detects LinkedIn posts containing the phrase "changed the game" and creates spectacular explosion effects!

## 🚀 Features

- **Automatic Keyword Detection**: Continuously scans LinkedIn feed for posts containing "changed the game"
- **Dynamic Highlighting**: Target keywords are highlighted with animated glow effects
- **Explosive Visual Effects**: Posts explode with enhanced particle effects and sound
- **Targeting Indicators**: Posts get a target emoji indicator before explosion
- **Real-time Monitoring**: Automatically detects new posts as they load
- **Enhanced Particles**: 50+ colorful particles with varied velocities and rotations

## 🎮 How It Works

1. The extension automatically loads when you visit LinkedIn
2. It continuously searches for posts containing "changed the game" (case insensitive)
3. When found, the keyword gets highlighted with a glowing animation
4. A targeting indicator (🎯) appears on the post
5. A bullet shoots from the bottom-right corner to the post center
6. The post explodes with enhanced visual and audio effects
7. The post is removed from your feed

## 📦 Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. Navigate to LinkedIn and watch the magic happen!

## 🎨 Visual Effects

- **Keyword Highlighting**: Animated gradient background with pulsing glow
- **Targeting System**: Visual indicators for detected posts
- **Shooting Effect**: Animated bullets with trailing effects
- **Explosion Particles**: 50+ particles with varied colors and physics
- **Flash Effect**: Central explosion flash with expanding shockwave
- **Sound Effects**: Explosion audio at 40% volume

## 🔧 Technical Details

- **Manifest Version**: 3
- **Permissions**: Storage, ActiveTab
- **Content Script**: Runs on all LinkedIn pages
- **Audio**: Uses Web Audio API for explosion sounds
- **Performance**: Debounced search to prevent excessive DOM queries
- **Memory**: Automatic cleanup of visual effects

## 🎯 Search Criteria

The extension searches for the exact phrase: **"changed the game"**
- Case insensitive matching
- Searches all text content within LinkedIn posts
- Continuously monitors for new dynamically loaded content

## 📁 Backup System

All original files are backed up in the `backup/` folder and excluded from version control via `.gitignore`.

## 🔄 Version History

- **v2.0**: Keyword search and explosion functionality
- **v1.0**: Original profile blocking functionality (backed up)

## 🤝 Contributing

Feel free to fork this repository and submit pull requests for improvements!

## ⚠️ Disclaimer

This extension is for entertainment purposes. Use responsibly and respect LinkedIn's terms of service. 