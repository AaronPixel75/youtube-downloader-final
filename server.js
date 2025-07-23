const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const app = express();
const port = process.env.PORT || 3000;

// Error handling
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Server status endpoint
app.get('/status', (req, res) => res.json({ status: 'online' }));

// Get video info endpoint
app.post('/info', async (req, res) => {
  try {
    const url = req.body.url;
    const videoId = ytdl.getVideoID(url);
    const info = await ytdl.getInfo(videoId);
    
    res.json({
      id: videoId,
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails.pop().url,
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
    const { id, itag } = req.query;
    if (!id || !itag) return res.status(400).json({ error: 'Missing parameters' });
    
    const url = `https://www.youtube.com/watch?v=${id}`;
    const info = await ytdl.getInfo(url);
    const format = info.formats.find(f => f.itag == itag);
    if (!format) return res.status(404).json({ error: 'Format not available' });
    
    const safeTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.${format.container}"`);
    res.setHeader('Content-Type', format.mimeType);
    
    ytdl(url, { format }).pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Download failed' });
  }
});

// Audio download endpoint
app.get('/audio', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing video ID' });
    
    const url = `https://www.youtube.com/watch?v=${id}`;
    const info = await ytdl.getInfo(url);
    const safeTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '');
    
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');
    
    ytdl(url, { filter: 'audioonly', quality: 'highestaudio' }).pipe(res);
  } catch (error) {
    console.error('Audio download error:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Audio download failed' });
  }
});

// Start server
app.listen(port, () => console.log(`Server running on port ${port}`));