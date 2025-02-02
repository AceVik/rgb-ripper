import path from 'node:path';
import { Service } from 'typedi';

@Service()
export class HlsService {
  /**
   * Parst eine Master-M3U8-Datei, findet alle Bandwidth-Angaben und dazugehörigen URIs.
   */
  parseMasterM3U8(m3u8Content: string): { bandwidth: number; uri: string }[] {
    const lines = m3u8Content.split('\n');
    const variants: { bandwidth: number; uri: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#EXT-X-STREAM-INF')) {
        // Beispiel: #EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=9057000,RESOLUTION=1920x1080,NAME="1080P Streaming"
        const match = /BANDWIDTH=(\d+)/.exec(line);
        if (match) {
          const bw = parseInt(match[1], 10);
          // Nächste Zeile enthält dann die URI
          const uriLine = lines[i + 1]?.trim();
          if (uriLine && !uriLine.startsWith('#')) {
            variants.push({ bandwidth: bw, uri: uriLine });
          }
        }
      }
    }

    return variants;
  }

  /**
   * Parst eine Media-M3U8-Datei (enthält #EXTINF-Zeilen) und gibt eine Liste von Segment-URIs zurück.
   */
  parseMediaM3U8(m3u8Content: string): string[] {
    const lines = m3u8Content.split('\n').map((l) => l.trim());
    const segments: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Jede #EXTINF-Zeile wird gefolgt von einer TS-URI-Zeile
      if (line.startsWith('#EXTINF')) {
        const uri = lines[i + 1]?.trim();
        if (uri && !uri.startsWith('#')) {
          segments.push(uri);
        }
      }
    }

    return segments;
  }

  /**
   * Fügt einen relativen oder "./pfad.ts" an das Basisverzeichnis an.
   * Wenn die URI mit "http" beginnt, lassen wir sie unverändert.
   */
  resolveM3U8Url(baseUrl: string, relativeOrAbsolute: string): string {
    // Falls already absolute (http...), einfach zurückgeben
    if (/^https?:\/\//i.test(relativeOrAbsolute)) {
      return relativeOrAbsolute;
    }

    // "baseUrl" könnte z.B. "/members/content//upload/rgb_paula-01/rgb_paula-01.m3u8" sein
    // -> Wir wollen den Ordner anvisieren
    // -> Wenn das baseUrl /some/path/to.m3u8 ist, extrahieren wir /some/path/ als directory
    const baseDir = path.posix.dirname(baseUrl);

    // Normalisieren wir z.B.: baseDir + "/" + relativeOrAbsolute
    // In einem reinen Browser-Umfeld könnte man URL-Objekte nutzen,
    // hier machen wir es manuell simpler:
    // Die M3U8-Links nutzen i.d.R. posix'/', also path.posix
    // Wir entfernen evtl. Doppel-Slashes, etc.
    return path.posix.join(baseDir, relativeOrAbsolute);
  }
}
