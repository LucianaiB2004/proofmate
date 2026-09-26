import type { SourceFragment } from '../../domain/types';

const entities: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
};

function decodeEntities(value: string) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const hexadecimal = entity[1]?.toLowerCase() === 'x';
      const code = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return entities[entity.toLowerCase()] ?? match;
  });
}

export function normalizeFingerprint(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

export function cleanExtractedText(text: string): string {
  return decodeEntities(text)
    .replace(/\r\n?/g, '\n')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/?(?:table|thead|tbody|tfoot|tr|caption|section|article|div|p|h[1-6]|ul|ol)\b[^>]*>/gi, '\n')
    .replace(/<\/?(?:td|th|li)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/```[\w-]*\n?/g, '\n')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*(?:[-*+]\s+|>\s*)/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_~`]+/g, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function segmentExtractedText(text: string, source: string, evidenceId: string): SourceFragment[] {
  const cleaned = cleanExtractedText(text);
  const chunks = cleaned
    .split(/\n+/)
    .map((value) => value.replace(/\s+/g, ' ').trim())
    .filter((value) => normalizeFingerprint(value).length >= 8);
  return chunks.map((value, index) => {
    const fingerprint = normalizeFingerprint(value);
    return {
      id: `${evidenceId}-fragment-${index + 1}`,
      evidenceId,
      source,
      locator: `段落 ${index + 1}`,
      text: value,
      fingerprint,
    };
  });
}
