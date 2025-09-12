const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const VideoModel = require('../models/video');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const JWT_SECRET = 'JWT_SECRET';

// helpers (promise-wrapped)
const ffprobeMeta = (p) => new Promise((resolve, reject) => {
  ffmpeg.ffprobe(p, (err, meta) => err ? reject(err) : resolve(meta));
});
const makeThumb = (inputPath, thumbPath, atSecond = 5) => new Promise((resolve, reject) => {
  ffmpeg(inputPath)
    .on('end', resolve)
    .on('error', reject)
    .screenshots({
      timestamps: [atSecond],
      filename: path.basename(thumbPath),
      folder: path.dirname(thumbPath),
      size: '320x240'
    });
});

const uploadVideo = async (req, res) => {
  try {
    // Basic checks
    if (!req.files || !req.files.files) {
      return res.status(400).json({ message: 'No files were uploaded' });
    }

    // Auth (cookie or bearer fallback is nice)
    let token = req.cookies?.token;
    if (!token) {
      const auth = req.headers.authorization;
      if (auth?.startsWith('Bearer ')) token = auth.slice(7);
    }
    if (!token) return res.status(401).json({ message: 'No token provided' });

    let user;
    try {
      user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Normalize to array
    const files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];

    console.log('[upload] start');
    const results = await Promise.all(files.map(async (file) => {
      const uploadPath = path.join(__dirname, '..', 'uploads', file.name);
      const thumbnailPath = path.join(__dirname, '..', 'thumbnails', `${path.parse(file.name).name}.png`);

      fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
      fs.mkdirSync(path.dirname(thumbnailPath), { recursive: true });

      // Move file
      await file.mv(uploadPath);
      console.log('[upload] saved to disk');

      // Metadata
      console.log('[upload] before ffprobe');
      const meta = await ffprobeMeta(uploadPath);
      const duration = meta?.format?.duration ?? 0;
      const codec = meta?.streams?.find(s => s.codec_type === 'video')?.codec_name || 'unknown';
      console.log('[upload] after ffprobe', { duration });

      // Thumbnail
      console.log('[upload] before thumbnail');
      await makeThumb(uploadPath, thumbnailPath, 5);
      console.log('[upload] after thumbnail');

      // DB
      console.log('[upload] before DB');
      const video = {
        title: file.name,
        filename: file.name,
        filepath: `/uploads/${file.name}`,
        mimetype: file.mimetype,
        size: file.size,
        duration,
        author: user.userID,
        thumbnail: `/thumbnails/${path.basename(thumbnailPath)}`,
        codec
      };
      const videoID = await VideoModel.addVideo(video); // ensure this returns a Promise and stringifies BigInt insertId
      console.log('[upload] after DB');

      return { message: 'File uploaded and metadata saved', file: file.name, videoID };
    }));

    // Single response for all files
    console.log('[upload] before res');
    return res.status(201).json(results);

  } catch (err) {
    console.error('[upload] error:', err);
    // Map known errors if you want
    if (err?.message?.includes('ffprobe')) {
      return res.status(500).json({ message: 'ffprobe not available', error: err.message });
    }
    return res.status(500).json({ message: 'Upload failed', error: err.message });
  }
};



const authorVideo = async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized: no token provided' });

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized: invalid token' });
  }

  try {
    const videos = await VideoModel.getVideosByAuthor(decoded.userID);
    res.json(videos);
  } catch (e) {
    console.error('DB error:', e);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
};


const getVideo = async (req, res) => {
  try {
    const videoID = req.params.id;
    const video = await VideoModel.getVideoById(videoID);

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    res.json(video); // or [video] depending on frontend
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Failed to fetch video" });
  }
};

// Delete a video of specific id
const deleteVideo = (req, res) => {
    const videoId = req.params.id;
    console.log('umm:',req.params.id)
    VideoModel.getVideoById(videoId, (err, video) => { // Assuming you have a method to get video metadata
        if (err) {
            return res.status(500).json({ message: 'Server error', error: err.message });
        }

        if (!video) { 
            return res.status(404).json({ message: 'Video not found' });
        }
        console.log("video")
        const videoPath = path.join(__dirname, '..', 'uploads', video[0].filename);
        const thumbnailPath = path.join(__dirname, '..', 'thumbnails', `${path.basename(video[0].filename, path.extname(video[0].filename))}.png`);
        console.log("do i get past dis")
        // Delete the video file and thumbnail
        fs.unlink(videoPath, (err) => {
            if (err) {
                return res.status(500).json({ message: 'Failed to delete video file', error: err.message });
            }

            fs.unlink(thumbnailPath, (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Failed to delete thumbnail file', error: err.message });
                }

                // Proceed to delete the video metadata
                VideoModel.deleteVideo(videoId, (err, wasDeleted) => {
                    if (err) {
                        return res.status(500).json({ message: 'Server error', error: err.message });
                    }

                    if (!wasDeleted) {
                        return res.status(404).json({ message: 'Video not found' });
                    }

                    res.status(200).json({ message: 'Video deleted successfully' });
                });
            });
        });
    });
};
// Define a mapping of MIME types to file formats
const mimeTypeToFormat = {
    'video/mp4': 'mp4',
    'video/avi': 'avi',
    'video/mkv': 'mkv',
    'video/quicktime': 'mov',
    'video/x-ms-wmv': 'wmv',
    'video/x-flv': 'flv',
    'video/webm': 'webm',
    'video/mpeg': 'mpeg',
    'video/3gpp': '3gp',
    'video/ogg': 'ogg'
};

// Function to get the format from MIME type
const getFormatFromMimeType = (mimeType) => {
    return mimeTypeToFormat[mimeType] || null; // Default to 'unknown' if MIME type is not found
};
// --- Helpers using fluent-ffmpeg ---

function FFreformatVideo(inputPath, outputPath, outputFormat, outputCodec, cb) {
  try {
    ffmpeg(inputPath)
      .videoCodec(outputCodec)           // e.g. 'libx264'
      .format(outputFormat)              // e.g. 'mp4', 'avi'
      // optional tuning flags:
      // .outputOptions(['-movflags +faststart']) // good for mp4 streaming
      .on('start', cmd => console.log('[ffmpeg] start:', cmd))
      .on('progress', p => console.log(`[ffmpeg] ${Math.round(p.percent || 0)}%`))
      .on('error', err => {
        console.error('[ffmpeg] error:', err);
        cb(err);
      })
      .on('end', () => {
        console.log('[ffmpeg] done:', outputPath);
        cb(null, outputPath);
      })
      .save(outputPath);
  } catch (e) {
    cb(e);
  }
}

function FFgetVideoMetadata(inputPath, cb) {
  ffmpeg.ffprobe(inputPath, (err, data) => {
    if (err) return cb(err);
    const stream = (data.streams || []).find(s => s.codec_type === 'video') || {};
    const format = data.format || {};
    cb(null, {
      duration: Math.round(format.duration || 0),
      codec: stream.codec_name || null,
      width: stream.width || null,
      height: stream.height || null,
      formatName: format.format_name || null,
    });
  });
}

function FFcaptureThumbnail(inputPath, outputPath, atSeconds = 5, cb) {
  ffmpeg(inputPath)
    .on('error', cb)
    .on('end', () => cb(null, outputPath))
    .screenshots({
      timestamps: [atSeconds],
      filename: path.basename(outputPath),
      folder: path.dirname(outputPath),
      size: '640x?'
    });
}

// --- Codec mapping: map codec names from metadata to valid ffmpeg encoders
const codecMap = {
  h264: "libx264",
  hevc: "libx265",
  vp9: "libvpx-vp9",
  vp8: "libvpx",
  mpeg4: "mpeg4",
  theora: "libtheora"
};

// Changes the video's codec
const reformatVideo = (req, res) => {
  const { format: newFormat, codec: newCodec, videoData } = req.body;
  console.log("reformat payload:", req.body);

  // Validate input
  if (!newFormat || !newCodec || !videoData || !videoData.filepath) {
    return res.status(400).json({ message: "Missing required parameters." });
  }

  // Map the input codec (from DB/metadata) to something ffmpeg can actually use
  const inputCodec = codecMap[videoData.codec] || "libx264";
  const inputPath = path.join(__dirname, "..", videoData.filepath);

  // Output file paths
  const outputDirectory = path.join(__dirname, "..", "output_directory");
  const outputFilename = `${path.basename(
    videoData.filename,
    path.extname(videoData.filename || "")
  )}.${newFormat}`;
  const outputPath = path.join(outputDirectory, outputFilename);

  // Ensure output directory exists
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }

  // Run ffmpeg
  ffmpeg(inputPath)
    .videoCodec(newCodec || inputCodec) // user’s chosen codec or mapped fallback
    .format(newFormat)
    .on("start", cmd => console.log("Running ffmpeg:", cmd))
    .on("end", () => {
      console.log("Reformat finished:", outputPath);
      res.status(200).json({
        message: "Video reformatted successfully",
        outputPath
      });
    })
    .on("error", err => {
      console.error("FFmpeg error:", err.message);
      res.status(500).json({
        message: "Error reformatting video",
        error: err.message
      });
    })
    .save(outputPath);
};



// Function to download video
const downloadVideo = (req, res) => {
    const outputDirectory = path.join(__dirname, '..', 'output_directory');
    
    fs.readdir(outputDirectory, (err, files) => {
        if (err) {
            return res.status(500).json({ message: 'Error reading output directory', error: err });
        }

        // Filter for video files based on possible extensions
        const videoFile = files.find(file => Object.values(mimeTypeToFormat).some(ext => file.endsWith(`.${ext}`)));

        if (!videoFile) {
            return res.status(404).json({ message: 'No video file found in the output directory' });
        }

        const filePath = path.join(outputDirectory, videoFile);

        // Extract the MIME type from the file extension
        const fileExtension = path.extname(videoFile).substring(1); // Get file extension without the dot
        const mimeType = Object.keys(mimeTypeToFormat).find(key => mimeTypeToFormat[key] === fileExtension);

        if (!mimeType) {
            return res.status(415).json({ message: 'Unsupported video file format' });
        }

        // Set the Content-Type header based on the MIME type
        res.setHeader('Content-Type', mimeType);

        // Use res.download to send the file to the client with the correct filename
        res.download(filePath, videoFile, (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error downloading video file', error: err });
            }

            // Optionally delete the file after download
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error('Error deleting video file:', err);
                }
            });
        });
    });
};

module.exports = {
    uploadVideo,
    authorVideo,
    getVideo,
    deleteVideo,
    reformatVideo,
    downloadVideo,
}