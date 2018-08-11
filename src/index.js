import { get, toNumber } from 'lodash';
import uuidV1 from 'uuid/v1';
import process from 'process';
import dotenv from 'dotenv';
import { PassThrough } from 'stream';

import { S3 } from 'aws-sdk';
import youtubeStream from 'youtube-audio-stream';
import ffmpeg from 'fluent-ffmpeg';
import url from 'url';
import parseYoutubeStartTime from './parseYoutubeStartTime';
import mongoose from 'mongoose';
import Sound from './models/Sound';
import { getInfo } from 'ytdl-core';
import { start } from 'repl';

dotenv.config();

const BUCKET = process.env.BUCKET || 'youtube-soundboard';
const MAX_DURATION = process.env.MAX_DURATION || 5;
const URL = 'https://www.youtube.com/watch?v=HPltbD-4QA';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/soundboard';

const getYoutubeVideo = youtubeUrl => new Promise((resolve, reject) => {
  try {
    const stream = youtubeStream(youtubeUrl);
    stream.on('info', info => {
      resolve({ stream, info });
    });

  } catch (e) {
    reject(e);
  }
});

const getTimeAndStartTime = youtubeUrl => {
  const parsedUrl = url.parse(youtubeUrl, true);
  console.log(parsedUrl);
  const queryParams = parsedUrl.query;
  const startTime = get(queryParams, 't', 0);
  const duration = queryParams.duration || MAX_DURATION;
  const startSeconds = parseYoutubeStartTime(startTime);

  return {
    startTime: startSeconds,
    duration: toNumber(duration),
  }
};

const processYoutubeVideo = async (youtubeUrl, startTime, duration) => {
  const file = new PassThrough();
  console.log('here');
  console.log(youtubeUrl);


  const {
    stream,
  } = await getYoutubeVideo(youtubeUrl);

  ffmpeg(stream)
    .format('mp3')
    .seekOutput(startTime || '00:00:00')
    .duration(duration)
    .pipe(file);
  return file;
}

const uploadAudio = (key, stream) => new Promise((resolve, reject) => {
  const s3 = new S3();
  const uuid = uuidV1();
  s3.upload({
    Bucket: BUCKET,
    Key: `${key}-${uuid}.mp3`,
    Body: stream,
    ContentType: 'audio/mpeg',
  }, (err, data) => {
    if (err) {
      console.error(err)
      reject(err);
    } else {
      const { Location, Bucket, Key } = data;
      console.log(data);
      resolve(data);
      // const url = s3.getSignedUrl('getObject', { Bucket, Key });
      // console.log(url);
    }
  });
});


export const handler = async ({ queryStringParameters: { url } }, event, callback) => {
  const connection = await mongoose.connect(MONGODB_URI);
  try {
    if (!url) {
      callback(new Error('Must specify a url!'));
    }

    const { video_id: videoId } = await getInfo(url);
    const { startTime, duration } = getTimeAndStartTime(url);

    const soundDoc = await Sound.findOne({
      videoId,
      duration,
      startTime,
    });

    if (soundDoc) {
      throw new Error('Sound already exists');
    }

    const file = await processYoutubeVideo(url, startTime, duration);

    const {
      Bucket,
      key,
    } = await uploadAudio(videoId, file);

    const newSoundDoc = new Sound({
      bucket: Bucket,
      key,
      created: new Date(),
      videoId,
      startTime,
      duration,
    });

    await newSoundDoc.save();

    callback(null, { body: 'Uploaded the video!!!!!!' });
  } catch (e) {
    callback(e, { body: JSON.stringify({ error: e.message }) });
  } finally {
    connection.disconnect();
  }
}
// const params = {
//   queryStringParameters: {
//     url: 'https://youtu.be/5jRBCdpO6Q0?t=9m53s&duration=2'
//     // url: 'https://www.youtube.com/watch?v=VHPltbD-4QA'
//   },
// };
// handler(params, null, (e, message) => { console.error(e); console.log(message)}).catch(e => { throw e; });