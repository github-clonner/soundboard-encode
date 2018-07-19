import fs from 'fs';
import process from 'process';
import dotenv from 'dotenv';
import { PassThrough } from 'stream';

import { S3 } from 'aws-sdk';
import youtubeStream from 'youtube-audio-stream';
import ffmpeg from 'fluent-ffmpeg';
import { resolve } from 'dns';

dotenv.config();

const BUCKET = process.env.BUCKET || 'youtube-soundboard';
const URL = 'https://www.youtube.com/watch?v=HPltbD-4QA';

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

const processYoutubeVideo = async (youtubeUrl) => {
  const file = new PassThrough();

  const {
    stream,
    info: { video_id: videoId }
  } = await getYoutubeVideo(youtubeUrl);


  ffmpeg(stream).format('mp3').setStartTime(0.2).pipe(file);
  return { file, videoId };
}

const uploadAudio = (key, stream) => new Promise((resolve, reject) => {
  const s3 = new S3();

  s3.upload({
    Bucket: BUCKET,
    Key: `${key}.mp3`,
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

export const handler = async ({ queryStringParameters: { url } = {} }, event, callback) => {
  if (!url) {
    callback(new Error('Must specify a url'));
  }

  try {
    const { file, videoId } = await processYoutubeVideo(url);
    const data = await uploadAudio(videoId, file);

    callback(null, { body: 'Uploaded the video!' });

  } catch (e) {
    callback(e);
  }
}

// uploadAudio(URL).catch(e => { throw e; });