import { describe, it, expect } from 'vitest';
import { escapeRegex, isValidObjectId } from '@/lib/utils/validation';

describe('escapeRegex', () => {
    it('escapes dot', () => expect(escapeRegex('1.0')).toBe('1\\.0'));
    it('escapes asterisk', () => expect(escapeRegex('a*b')).toBe('a\\*b'));
    it('escapes parentheses', () => expect(escapeRegex('a(b)')).toBe('a\\(b\\)'));
    it('escapes square brackets', () => expect(escapeRegex('[abc]')).toBe('\\[abc\\]'));
    it('escapes backslash', () => expect(escapeRegex('a\\b')).toBe('a\\\\b'));
    it('leaves safe strings unchanged', () =>
        expect(escapeRegex('hello world')).toBe('hello world'));
    it('escapes a complex injection attempt', () =>
        expect(escapeRegex('.*+?^${}()|[]\\')).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\'));
});

describe('isValidObjectId', () => {
    it('accepts a valid 24-char hex ObjectId', () =>
        expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true));

    it('rejects a string that is too short', () => expect(isValidObjectId('abc')).toBe(false));

    it('rejects an empty string', () => expect(isValidObjectId('')).toBe(false));

    it('rejects non-hex characters', () =>
        expect(isValidObjectId('zzzzzzzzzzzzzzzzzzzzzzzz')).toBe(false));
});
