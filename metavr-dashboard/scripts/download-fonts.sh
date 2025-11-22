#!/bin/sh
set -e

echo "Downloading Google Fonts for local use..."

# Create fonts directory
mkdir -p public/fonts/inter
mkdir -p public/fonts/jetbrains-mono

# Function to download Inter font
download_inter() {
  echo "Downloading Inter font..."
  curl -L "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" -o /tmp/inter.css 2>/dev/null || true
  
  if [ -f /tmp/inter.css ]; then
    # Extract and download each font file
    grep -oP 'url\(https://[^)]+\.woff2\)' /tmp/inter.css | while read -r line; do
      url=$(echo "$line" | sed 's/url(\(.*\))/\1/' | tr -d '()')
      if [ -n "$url" ]; then
        # Extract weight from URL or filename
        weight=$(echo "$url" | grep -oP 'wght@\K[0-9]+' || echo "400")
        filename="Inter-${weight}.woff2"
        echo "  Downloading $filename..."
        curl -L "$url" -o "public/fonts/inter/$filename" 2>/dev/null || echo "    Failed to download $filename"
      fi
    done
  fi
}

# Function to download JetBrains Mono font
download_jetbrains() {
  echo "Downloading JetBrains Mono font..."
  curl -L "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" -o /tmp/jetbrains.css 2>/dev/null || true
  
  if [ -f /tmp/jetbrains.css ]; then
    # Extract and download each font file
    grep -oP 'url\(https://[^)]+\.woff2\)' /tmp/jetbrains.css | while read -r line; do
      url=$(echo "$line" | sed 's/url(\(.*\))/\1/' | tr -d '()')
      if [ -n "$url" ]; then
        # Extract weight from URL or filename
        weight=$(echo "$url" | grep -oP 'wght@\K[0-9]+' || echo "400")
        filename="JetBrainsMono-${weight}.woff2"
        echo "  Downloading $filename..."
        curl -L "$url" -o "public/fonts/jetbrains-mono/$filename" 2>/dev/null || echo "    Failed to download $filename"
      fi
    done
  fi
}

# Try to download fonts
download_inter
download_jetbrains

# Clean up
rm -f /tmp/inter.css /tmp/jetbrains.css

# Check if any fonts were downloaded
if [ -n "$(ls -A public/fonts/inter/*.woff2 2>/dev/null)" ] || [ -n "$(ls -A public/fonts/jetbrains-mono/*.woff2 2>/dev/null)" ]; then
  echo "Fonts downloaded successfully!"
else
  echo "Warning: No fonts were downloaded. Build will continue with fallback fonts."
fi
