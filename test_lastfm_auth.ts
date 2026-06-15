import dotenv from 'dotenv';
dotenv.config();

import { AuthService } from './src/backend/services/authService';
import { LastFmService } from './src/backend/services/lastfmService';
import { FileStorage } from './src/backend/utils/fileStorage';

async function test() {
  const fs = new FileStorage();
  const auth = new AuthService(fs);
  const lastfm = new LastFmService(fs, auth);
  console.log('Getting auth url...');
  const url = await lastfm.getAuthUrl();
  console.log('Got auth url:', url);
}
test().catch(console.error);
