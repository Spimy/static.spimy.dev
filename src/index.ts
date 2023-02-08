import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';

import cdnRouter from './routes/cdn.route';

// Read .env and create app instance
config();
const app = express();

// Setup app
app.enable('trust proxy');
app.use(express.json());
app.use('/', cdnRouter);

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'uploads')));

// Handle status 404 routes
app.use((_request, response, _next) => {
  return response
    .status(404)
    .send({ message: 'You have stumbled across an inexistent path.' });
});

// Setup cors
app.use(
  cors({
    origin: ['https://spimy.dev', 'https://*.spimy.dev']
  })
);

// Setup cache control
app.use((request, response, next) => {
  const cacheDays = 3;
  if (request.method === 'GET') {
    // Cache for 3 days
    response.set(
      'Cache-control',
      `public, max-age=${cacheDays * 1000 * 24 * 3600}`
    );
  } else {
    response.set('Cache-control', `no-store`);
  }

  next();
});

app.listen(process.env.PORT, () =>
  console.log(`Listening on port ${process.env.PORT}`)
);
