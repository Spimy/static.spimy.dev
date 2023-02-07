import { Request, Response } from "express";

export const isAuth = (request: Request, response: Response, next: Function) => {
  const auth = request.headers.authorization;

  if (auth !== process.env.UPLOAD_TOKEN) {
    return response.status(401).send({ message: 'A valid authorization token is required.' });
  }

  next();
}