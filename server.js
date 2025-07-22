const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Server status endpoint
app.get('/status', (req, res) => {
  res.json({ status: 'online' });
});

// Get video info endpoint
app.post('/info', async (req, res) => {
  try {
    const url = req.body.url;
    const videoId = ytdl.getVideoID(url);
    
    const info = await ytdl.getInfo(videoId);
    
    res.json({
      id: videoId,
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
      duration: parseInt(info.videoDetails.lengthSeconds),
      views: parseInt(info.videoDetails.viewCount),
      channel: info.videoDetails.author.name,
      formats: info.formats.map(format => ({
        itag: format.itag,
        container: format.container,
        qualityLabel: format.qualityLabel,
        contentLength: format.contentLength,
        mimeType: format.mimeType,
        hasAudio: format.hasAudio,
        hasVideo: format.hasVideo
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to retrieve video information' });
  }
});

// Video download endpoint
app.get('/download', async (req, res) => {
  try {
    const { id, itag, format } = req.query;
    
    if (!id || !itag || !format) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    
    const url = `https://www.youtube.com/watch?v=${id}`;
    const info = await ytdl.getInfo(url);
    
    // Find the requested format
    const selectedFormat = info.formats.find(f => f.itag == itag);
    
    if (!selectedFormat) {
      return res.status(404).json({ error: 'Requested format not available' });
    }
    
    // Create safe filename
    const safeTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '');
    const filename = `${safeTitle}.${format}`;
    
    // Set headers
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', selectedFormat.mimeType);
    
    // Pipe the video stream
    ytdl(url, { 
      format: selectedFormat,
      quality: 'highest',
      highWaterMark: 1024 * 1024 * 10 // 10MB buffer
    }).pipe(res);
    
  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Download failed', 
        details: error.message 
      });
    }
  }
});

// Audio download endpoint
app.get('/audio', async (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing video ID' });
    }
    
    const url = `https://www.youtube.com/watch?v=${id}`;
    const info = await ytdl.getInfo(url);
    
    // Create safe filename
    const safeTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '');
    const filename = `${safeTitle}.mp3`;
    
    // Set headers
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'audio/mpeg');
    
    // Pipe the audio stream
    ytdl(url, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1024 * 1024 * 10 // 10MB buffer
    }).pipe(res);
    
  } catch (error) {
    console.error('Audio download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Audio download failed', 
        details: error.message 
      });
    }
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});