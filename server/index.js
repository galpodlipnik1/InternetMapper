import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import linkRoutes from './routes/link.js';

const app = express();


dotenv.config();
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

app.use('/links', linkRoutes);

app.get('/', (req, res) => {
  let date = new Date();
  let message = `Server is running`;
  let time = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
  let latency = date.getMilliseconds();
  let version = '0.0';

  res.status(200).json({ status: 200, message: message, time: time, latency: latency , version: version });
});

const CONNECTION_URL = process.env.CONNECTION_URL;
const PORT = process.env.PORT || 5000;

mongoose
  .connect(CONNECTION_URL)
  .then(() => console.log('MongoDB connected...'))
  .finally(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch((error) => console.log(error.message));