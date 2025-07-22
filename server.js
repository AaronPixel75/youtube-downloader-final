const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const app = express();
const port = 3000;

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

// Download video endpoint
app.post('/download', async (req, res) => {
  try {
    const { id, itag, format } = req.body;
    const url = `https://www.youtube.com/watch?v=${id}`;
    
    // Set headers
    const filename = `${id}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (format === 'mp3') {
      // For audio format
      res.setHeader('Content-Type', 'audio/mpeg');
      ytdl(url, { filter: 'audioonly', quality: 'highestaudio' })
        .pipe(res);
    } else {
      // For video formats
      const videoFormat = ytdl.chooseFormat(await ytdl.getInfo(url), { quality: itag });
      res.setHeader('Content-Type', `video/${videoFormat.container}`);
      ytdl(url, { format: videoFormat })
        .pipe(res);
    }
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to download video' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});