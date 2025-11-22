#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, '../src/fonts');
const interDir = path.join(fontsDir, 'inter');
const jetbrainsDir = path.join(fontsDir, 'jetbrains-mono');

// Create directories
[fontsDir, interDir, jetbrainsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      reject(err);
    });
  });
}

function fetchCSS(fontFamily, weights) {
  return new Promise((resolve, reject) => {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@${weights.join(';')}&display=swap`;
    https.get(url, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function downloadFonts() {
  console.log('Downloading Google Fonts...\n');

  // Download Inter
  try {
    console.log('Downloading Inter font...');
    const interCSS = await fetchCSS('Inter', ['400', '500', '600', '700']);
    const interUrls = interCSS.match(/url\(https:\/\/[^)]+\.woff2\)/g) || [];
    
    for (const urlMatch of interUrls) {
      const url = urlMatch.replace(/url\(|\)/g, '');
      const weightMatch = url.match(/wght@(\d+)/);
      const weight = weightMatch ? weightMatch[1] : '400';
      const filename = `Inter-${weight}.woff2`;
      const dest = path.join(interDir, filename);
      
      try {
        await download(url, dest);
        console.log(`  ✓ Downloaded ${filename}`);
      } catch (err) {
        console.log(`  ✗ Failed to download ${filename}: ${err.message}`);
      }
    }
  } catch (err) {
    console.log(`  ✗ Failed to fetch Inter CSS: ${err.message}`);
  }

  // Download JetBrains Mono
  try {
    console.log('\nDownloading JetBrains Mono font...');
    const jetbrainsCSS = await fetchCSS('JetBrains Mono', ['400', '500', '600']);
    const jetbrainsUrls = jetbrainsCSS.match(/url\(https:\/\/[^)]+\.woff2\)/g) || [];
    
    for (const urlMatch of jetbrainsUrls) {
      const url = urlMatch.replace(/url\(|\)/g, '');
      const weightMatch = url.match(/wght@(\d+)/);
      const weight = weightMatch ? weightMatch[1] : '400';
      const filename = `JetBrainsMono-${weight}.woff2`;
      const dest = path.join(jetbrainsDir, filename);
      
      try {
        await download(url, dest);
        console.log(`  ✓ Downloaded ${filename}`);
      } catch (err) {
        console.log(`  ✗ Failed to download ${filename}: ${err.message}`);
      }
    }
  } catch (err) {
    console.log(`  ✗ Failed to fetch JetBrains Mono CSS: ${err.message}`);
  }

  // Verify fonts were downloaded
  const interFiles = ['Inter-400.woff2', 'Inter-500.woff2', 'Inter-600.woff2', 'Inter-700.woff2'];
  const jetbrainsFiles = ['JetBrainsMono-400.woff2', 'JetBrainsMono-500.woff2', 'JetBrainsMono-600.woff2'];
  
  const interDownloaded = interFiles.every(file => {
    const filePath = path.join(interDir, file);
    return fs.existsSync(filePath) && fs.statSync(filePath).size > 100;
  });
  const jetbrainsDownloaded = jetbrainsFiles.every(file => {
    const filePath = path.join(jetbrainsDir, file);
    return fs.existsSync(filePath) && fs.statSync(filePath).size > 100;
  });
  
  if (interDownloaded && jetbrainsDownloaded) {
    console.log('\n✓ All fonts downloaded successfully!');
    console.log(`Fonts saved to: ${fontsDir}`);
  } else {
    console.log('\n⚠ Fonts failed to download. System font fallbacks will be used.');
    console.log('Build will continue without custom fonts.');
  }
}

downloadFonts().catch(err => {
  console.error('Error downloading fonts:', err);
  console.log('Build will continue with system font fallbacks.');
  // Don't exit with error - let build continue with fallbacks
  process.exit(0);
});

