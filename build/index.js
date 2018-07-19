"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.handler = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _process = _interopRequireDefault(require("process"));

var _dotenv = _interopRequireDefault(require("dotenv"));

var _stream = require("stream");

var _awsSdk = require("aws-sdk");

var _youtubeAudioStream = _interopRequireDefault(require("youtube-audio-stream"));

var _fluentFfmpeg = _interopRequireDefault(require("fluent-ffmpeg"));

var _dns = require("dns");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_dotenv.default.config();

const BUCKET = _process.default.env.BUCKET || 'youtube-soundboard';
const URL = 'https://www.youtube.com/watch?v=HPltbD-4QA';

const getYoutubeVideo = youtubeUrl => new Promise((resolve, reject) => {
  try {
    const stream = (0, _youtubeAudioStream.default)(youtubeUrl);
    stream.on('info', info => {
      resolve({
        stream,
        info
      });
    });
  } catch (e) {
    reject(e);
  }
});

const processYoutubeVideo = async youtubeUrl => {
  const file = new _stream.PassThrough();
  const {
    stream,
    info: {
      video_id: videoId
    }
  } = await getYoutubeVideo(youtubeUrl);
  (0, _fluentFfmpeg.default)(stream).format('mp3').setStartTime(0.2).pipe(file);
  return {
    file,
    videoId
  };
};

const uploadAudio = (key, stream) => new Promise((resolve, reject) => {
  const s3 = new _awsSdk.S3();
  s3.upload({
    Bucket: BUCKET,
    Key: `${key}.mp3`,
    Body: stream,
    ContentType: 'audio/mpeg'
  }, (err, data) => {
    if (err) {
      console.error(err);
      reject(err);
    } else {
      const {
        Location,
        Bucket,
        Key
      } = data;
      console.log(data);
      resolve(data); // const url = s3.getSignedUrl('getObject', { Bucket, Key });
      // console.log(url);
    }
  });
});

const handler = async ({
  queryStringParameters: {
    url
  }
}, event, callback) => {
  if (!url) {
    callback(new Error('Must specify a url'));
  }

  try {
    const {
      file,
      videoId
    } = await processYoutubeVideo(url);
    const data = await uploadAudio(videoId, file);
    callback(null, {
      body: 'Uploaded the video!'
    });
  } catch (e) {
    callback(e);
  }
}; // uploadAudio(URL).catch(e => { throw e; });


exports.handler = handler;