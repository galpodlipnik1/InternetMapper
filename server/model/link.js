import mongoose from 'mongoose';

const linkSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    unique: true
  },
  links: [{
    type: String
  }],
  parent: {
    type: String,
    default: null
  },
  crawlTime: {
    type: Date,
    default: Date.now
  },
  crawlDepth: {
    type: Number,
    default: 3
  },
});

const Link = mongoose.model('Link', linkSchema);

export default Link;