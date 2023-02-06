import { config } from 'dotenv';
import express from 'express';
import path from 'path';

import cdnRouter from './routes/cdn.route';

// Read .env and create app instance
config();
const app = express();

// Setup app
app.use(express.json());
app.use('/', cdnRouter);
app.use(express.static(path.join(__dirname, '..', 'uploads')));
app.use((_request, response, _next) => {
  return response
    .status(404)
    .send({ message: 'You have stumbled across an inexistent path.' });
});

app.listen(process.env.PORT, () => console.log(`Listening on port ${process.env.PORT}`));