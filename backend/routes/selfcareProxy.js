import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Proxy Google Drive audio files
router.get('/audio/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const url = `https://drive.google.com/uc?export=download&id=${fileId}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'audio/*,*/*;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch file from Google Drive');
    }

    // Set headers for optimal audio streaming and caching
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const contentLength = response.headers.get('content-length');
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    
    // Audio streaming headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Aggressive caching for faster loading
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable'); // Cache for 24 hours
    res.setHeader('ETag', `"${fileId}"`);
    
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Handle range requests for better streaming
    const range = req.headers.range;
    if (range && contentLength) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : parseInt(contentLength) - 1;
      const chunksize = (end - start) + 1;
      
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${contentLength}`);
      res.setHeader('Content-Length', chunksize);
    }

    // Stream the audio file with better buffering
    response.body.pipe(res);
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).send('Error proxying audio file');
  }
});

// Proxy Google Drive image files
router.get('/image/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const url = `https://drive.google.com/uc?export=download&id=${fileId}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*,*/*;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch image from Google Drive');
    }

    // Set headers for optimal image loading and caching
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const contentLength = response.headers.get('content-length');
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Image headers
    res.setHeader('Content-Type', contentType);
    
    // Aggressive caching for faster loading
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable'); // Cache for 24 hours
    res.setHeader('ETag', `"${fileId}"`);
    
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Stream the image file
    response.body.pipe(res);
    
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).send('Error proxying image file');
  }
});

export default router;