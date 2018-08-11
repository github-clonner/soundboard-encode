import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String },
  bucket: { type: String, required: true },
  key: { type: String, required: true },
  videoId: { type: String, required: true },
  created: { type: Date, required: true },
  duration: { type: Number, required: true },
  startTime: { type: Number, required: true },
});

schema.index({
  videoId: 1,
  startTime: 1,
  duration: 1,
});

export default mongoose.model('Sound', schema, 'sounds');