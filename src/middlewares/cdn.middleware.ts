import { Request, Response } from "express";

export const isAuth = (request: Request, response: Response, next: Function) => {
  const auth = request.headers.authorization;

  if (auth !== process.env.UPLOAD_TOKEN) {
    return response.status(401).send({ message: 'A valid authorization token is required.' });
  }

  next();
}

export const canRead = (request: Request, response: Response, next: Function) => {
  const auth = request.headers.authorization;

  if (auth === process.env.UPLOAD_TOKEN) {
    return next();
  }

  if (auth !== process.env.READONLY_TOKEN) {
    return response.status(401).send({ message: 'A valid read-only authorization token is required.' });
  }

  next();
}