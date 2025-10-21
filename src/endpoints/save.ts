import config from '../../config.json';
import { Application, Request, Response } from 'express';
import { apiMessage, errorMessage } from '../logger';
import { existsSync, mkdirSync } from 'fs';
import { generateID } from '../functions';
import { resolve, dirname } from 'path';

export default (app: Application) => {
  app.post('/save/:name', async (req: Request, res: Response) => {
    try {
      const apiKey = req.headers['api-key'];
      if (apiKey !== config.key) {
        errorMessage('Invalid API key provided');
        return res.status(400).send({ success: false, message: 'Invalid API key' });
      }
      apiMessage(req.path, 'User is trying to save a file');
      const file = (req.files as any).file;
      if (!file) {
        errorMessage('No file provided for upload');
        return res.status(400).send({ success: false, message: 'No file provided' });
      }
      const fileName = config.nameHide ? `${generateID(10)}.${req.params.name.split('.')[1]}` : req.params.name;
      const fileNamePattern = /^[a-zA-Z0-9]+\.(jpg|jpeg|png|mp4)$/;
      if (!fileNamePattern.test(fileName)) {
        return res.status(400).json({
          error:
            'Invalid file name. Please only use English Alphabet characters, 0-9. .jpg .jpeg .png .mp4 are the only supported file types',
        });
      }
      if (file.size > config.maxFileSize) {
        errorMessage('File is too big');
        return res.status(400).json({ success: false, message: 'File is too big' });
      }
      const dir = resolve(dirname(''), config.filesFolder);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const filePath = resolve(dir, fileName);
      if (existsSync(filePath)) {
        errorMessage(`File ${fileName} already exists`);
        return res.status(400).json({ success: false, message: `File ${fileName} already exists` });
      }
      try {
        await file.mv(filePath);
      } catch (err) {
        errorMessage(`Error moving file: ${err}`);
        return res.status(500).json({ success: false, message: 'Error occurred while saving the file' });
      }
      apiMessage(req.path, `File ${fileName} has been saved`);
      return res.status(200).json({
        success: true,
        message: `File has been saved at ${config.url}/${fileName}`,
        url: `${config.url}/${fileName}`,
        delete: `${config.url}/delete/${fileName}`,
      });
    } catch (err) {
      errorMessage(err as string);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
};
