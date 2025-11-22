#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';

/**
 * Downloads a file from Google Drive using gdown (Python package)
 * This is more reliable for Google Drive files
 */
async function downloadWithGdown(fileId: string, outputPath: string): Promise<boolean> {
  try {
    console.log('🐍 Attempting download with gdown (Python package)...');
    
    // Check if gdown is installed
    try {
      execSync('python3 -c "import gdown"', { stdio: 'pipe' });
    } catch {
      console.log('📦 Installing gdown...');
      execSync('pip3 install gdown', { stdio: 'inherit' });
    }
    
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Use gdown to download the file
    const command = `python3 -c "import gdown; gdown.download('https://drive.google.com/uc?id=${fileId}', '${outputPath}', quiet=False)"`;
    execSync(command, { stdio: 'inherit' });
    
    // Check if file was downloaded successfully
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      console.log('✅ Download successful with gdown!');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ gdown download failed:', error);
    return false;
  }
}

/**
 * Downloads a file from Google Drive using Node.js HTTPS
 */
async function downloadWithNode(fileId: string, outputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    console.log('🌐 Attempting download with Node.js HTTPS...');
    console.log(`🔗 URL: ${downloadUrl}`);
    
    const request = https.get(downloadUrl, (response) => {
      console.log(`📊 Response status: ${response.statusCode}`);
      console.log(`📊 Content-Type: ${response.headers['content-type']}`);
      console.log(`📊 Content-Length: ${response.headers['content-length']}`);
      
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          console.log(`🔄 Redirecting to: ${redirectUrl}`);
          return downloadWithNode(fileId, outputPath).then(resolve);
        }
      }
      
      // Check if we got HTML (confirmation page)
      if (response.headers['content-type']?.includes('text/html')) {
        console.log('⚠️  HTML response detected - file may require authentication');
        resolve(false);
        return;
      }
      
      // Check content length
      const contentLength = parseInt(response.headers['content-length'] || '0', 10);
      if (contentLength === 0) {
        console.log('⚠️  Empty file detected - file may not be accessible');
        resolve(false);
        return;
      }
      
      // Create output directory
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Create write stream
      const fileStream = fs.createWriteStream(outputPath);
      
      // Track download progress
      let downloadedBytes = 0;
      
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (contentLength > 0) {
          const progress = ((downloadedBytes / contentLength) * 100).toFixed(1);
          process.stdout.write(`\r📊 Progress: ${progress}% (${downloadedBytes}/${contentLength} bytes)`);
        }
      });
      
      response.on('end', () => {
        console.log(`\n✅ Download completed`);
        console.log(`📁 File saved to: ${outputPath}`);
        console.log(`📏 File size: ${downloadedBytes} bytes`);
        
        // Check if file has content
        if (downloadedBytes > 0) {
          resolve(true);
        } else {
          console.log('⚠️  Downloaded file is empty');
          resolve(false);
        }
      });
      
      response.on('error', (error) => {
        console.error(`❌ Download error:`, error);
        resolve(false);
      });
      
      // Pipe response to file
      response.pipe(fileStream);
      
      fileStream.on('error', (error) => {
        console.error(`❌ File write error:`, error);
        resolve(false);
      });
    });
    
    request.on('error', (error) => {
      console.error(`❌ Request error:`, error);
      resolve(false);
    });
    
    request.setTimeout(30000, () => {
      console.error('❌ Download timeout');
      request.destroy();
      resolve(false);
    });
  });
}

/**
 * Extracts file ID from Google Drive sharing URL
 */
function extractFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Main function to download the specified Google Drive file
 */
async function main() {
  const googleDriveUrl = 'https://drive.google.com/file/d/15jxv-pTmrQ9QgidJX1vscBJ4cC0xT4wi/view?usp=sharing';
  const outputDir = path.join(process.cwd(), 'downloads');
  const outputPath = path.join(outputDir, 'firebase-service-account.json');
  
  try {
    console.log('🚀 Starting Google Drive file download...');
    console.log(`🔗 Source URL: ${googleDriveUrl}`);
    
    // Extract file ID from URL
    const fileId = extractFileId(googleDriveUrl);
    if (!fileId) {
      throw new Error('Could not extract file ID from Google Drive URL');
    }
    
    console.log(`🆔 File ID: ${fileId}`);
    
    // Try Node.js download first
    let success = await downloadWithNode(fileId, outputPath);
    
    // If Node.js download failed, try gdown
    if (!success) {
      console.log('\n🔄 Node.js download failed, trying gdown...');
      success = await downloadWithGdown(fileId, outputPath);
    }
    
    if (success) {
      console.log('\n🎉 Download process completed successfully!');
      
      // Show file info
      const stats = fs.statSync(outputPath);
      console.log(`📁 File: ${outputPath}`);
      console.log(`📏 Size: ${stats.size} bytes`);
      console.log(`📅 Modified: ${stats.mtime.toLocaleString()}`);
    } else {
      console.log('\n❌ All download methods failed');
      console.log('\n💡 Troubleshooting tips:');
      console.log('   1. Ensure the Google Drive file is set to "Anyone with the link can view"');
      console.log('   2. Check if the file requires authentication');
      console.log('   3. Verify the file ID is correct');
      console.log('   4. Try accessing the file manually in a browser first');
      
      // Create a placeholder file to indicate download was attempted
      fs.writeFileSync(outputPath + '.failed', 'Download failed - see console output for details');
    }
    
  } catch (error) {
    console.error('💥 Download failed:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

export { downloadWithNode, downloadWithGdown, extractFileId };