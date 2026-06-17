import * as fs from 'fs';
import * as path from 'path';

import { logger } from '../utils/logger';

export interface ScrobbleOverride {
  discogsArtist: string;
  discogsAlbum: string;
  discogsTrack: string;
  lastfmArtist: string;
  lastfmAlbum: string;
  lastfmTrack: string;
  dateAdded: number;
}

export interface ScrobbleOverrideData {
  overrides: ScrobbleOverride[];
  version: string;
  lastUpdated: number;
}

class ScrobbleMappingService {
  private mappingsFilePath: string;
  private mappingsCache: Map<string, ScrobbleOverride> = new Map();
  private isLoaded = false;

  constructor() {
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    const mappingsDir = path.join(dataDir, 'mappings');
    if (!fs.existsSync(mappingsDir)) {
      fs.mkdirSync(mappingsDir, { recursive: true });
    }
    this.mappingsFilePath = path.join(mappingsDir, 'scrobble-overrides.json');
    this.loadMappings();
  }

  private generateKey(artist: string, album: string, track: string): string {
    return `${artist.toLowerCase().trim()}|${album.toLowerCase().trim()}|${track.toLowerCase().trim()}`;
  }

  private loadMappings(): void {
    try {
      if (fs.existsSync(this.mappingsFilePath)) {
        const data = fs.readFileSync(this.mappingsFilePath, 'utf8');
        const mappingData: ScrobbleOverrideData = JSON.parse(data);

        this.mappingsCache.clear();
        mappingData.overrides.forEach(override => {
          const key = this.generateKey(
            override.discogsArtist,
            override.discogsAlbum,
            override.discogsTrack
          );
          this.mappingsCache.set(key, override);
        });

        logger.info(
          `Loaded ${mappingData.overrides.length} scrobble overrides`
        );
      } else {
        logger.info('No scrobble overrides file found, starting empty');
      }
      this.isLoaded = true;
    } catch (error) {
      logger.error('Error loading scrobble overrides:', error);
      this.mappingsCache.clear();
      this.isLoaded = true;
    }
  }

  private saveMappings(): void {
    try {
      const overrides: ScrobbleOverride[] = Array.from(
        this.mappingsCache.values()
      );

      const mappingData: ScrobbleOverrideData = {
        overrides,
        version: '1.0',
        lastUpdated: Date.now(),
      };

      fs.writeFileSync(
        this.mappingsFilePath,
        JSON.stringify(mappingData, null, 2)
      );
      logger.info(`Saved ${overrides.length} scrobble overrides`);
    } catch (error) {
      logger.error('Error saving scrobble overrides:', error);
      throw new Error('Failed to save scrobble overrides');
    }
  }

  getOverride(
    artist: string,
    album: string,
    track: string
  ): ScrobbleOverride | undefined {
    if (!this.isLoaded) this.loadMappings();
    return this.mappingsCache.get(this.generateKey(artist, album, track));
  }

  getAllOverrides(): ScrobbleOverride[] {
    if (!this.isLoaded) this.loadMappings();
    return Array.from(this.mappingsCache.values());
  }

  setOverride(override: Omit<ScrobbleOverride, 'dateAdded'>): void {
    if (
      !override.discogsArtist ||
      !override.discogsAlbum ||
      !override.discogsTrack
    ) {
      throw new Error('Discogs artist, album, and track names are required');
    }

    const key = this.generateKey(
      override.discogsArtist,
      override.discogsAlbum,
      override.discogsTrack
    );

    this.mappingsCache.set(key, {
      ...override,
      dateAdded: Date.now(),
    });

    this.saveMappings();
    logger.info(
      `Added/updated scrobble override for: "${override.discogsArtist} - ${override.discogsTrack}"`
    );
  }

  removeOverride(artist: string, album: string, track: string): boolean {
    const key = this.generateKey(artist, album, track);
    const existed = this.mappingsCache.delete(key);
    if (existed) {
      this.saveMappings();
      logger.info(`Removed scrobble override for: "${artist} - ${track}"`);
    }
    return existed;
  }
}

export const scrobbleMappingService = new ScrobbleMappingService();
