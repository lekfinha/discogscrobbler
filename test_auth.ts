import dotenv from 'dotenv';
dotenv.config();

import { AuthService } from './src/backend/services/authService';
import { FileStorage } from './src/backend/utils/fileStorage';

async function test() {
  const fs = new FileStorage();
  const auth = new AuthService(fs);
  console.log('Getting settings...');
  const settings = await auth.getUserSettings();
  console.log('Got settings, saving...');
  settings.lastfm.apiKey = 'TEST';
  await auth.saveUserSettings(settings);
  console.log('Saved.');
}
test().catch(console.error);
