import { describe, it, expect } from 'vitest';
import {
  detectVariables,
  hasVariables,
  applyVariables,
  allFilled,
  keyToLabel,
  injectVariablePlaceholders,
} from './templateVars';

describe('templateVars utility functions', () => {
  describe('detectVariables', () => {
    it('should find variable placeholders in HTML', () => {
      const html = '<h1>{{title}}</h1><p>{{description}}</p>';
      const vars = detectVariables(html);
      expect(vars).toHaveLength(2);
      expect(vars[0].key).toBe('title');
      expect(vars[1].key).toBe('description');
    });

    it('should deduplicate variables', () => {
      const html = '{{title}} and {{title}} again';
      const vars = detectVariables(html);
      expect(vars).toHaveLength(1);
    });

    it('should handle variables with numbers and underscores', () => {
      const html = '{{user_name_123}}';
      const vars = detectVariables(html);
      expect(vars).toHaveLength(1);
      expect(vars[0].key).toBe('user_name_123');
      expect(vars[0].label).toBe('User Name 123');
    });

    it('should return empty array for no variables', () => {
      const html = '<p>No variables here</p>';
      const vars = detectVariables(html);
      expect(vars).toHaveLength(0);
    });

    it('should infer correct types', () => {
      const html = '{{url}} {{email}} {{color}} {{image}} {{description}} {{name}}';
      const vars = detectVariables(html);
      const types = vars.map((v) => v.type);
      expect(types).toContain('url');
      expect(types).toContain('email');
      expect(types).toContain('color');
      expect(types).toContain('image');
      expect(types).toContain('textarea');
      expect(types).toContain('text');
    });
  });

  describe('hasVariables', () => {
    it('should return true when variables exist', () => {
      expect(hasVariables('{{title}}')).toBe(true);
    });

    it('should return false when no variables exist', () => {
      expect(hasVariables('No variables here')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(hasVariables('')).toBe(false);
    });
  });

  describe('applyVariables', () => {
    it('should replace variables with values', () => {
      const html = '<h1>{{title}}</h1>';
      const vars = [{ key: 'title', value: 'Hello', label: '', type: 'text' as const, placeholder: '' }];
      const result = applyVariables(html, vars);
      expect(result).toBe('<h1>Hello</h1>');
    });

    it('should leave empty variables as-is', () => {
      const html = '<h1>{{title}}</h1>';
      const vars = [{ key: 'title', value: '', label: '', type: 'text' as const, placeholder: '' }];
      const result = applyVariables(html, vars);
      expect(result).toBe('<h1>{{title}}</h1>');
    });

    it('should handle case-insensitive matching', () => {
      const html = '{{Title}}';
      const vars = [{ key: 'title', value: 'Hello', label: '', type: 'text' as const, placeholder: '' }];
      const result = applyVariables(html, vars);
      expect(result).toBe('Hello');
    });

    it('should handle multiple variables', () => {
      const html = '<h1>{{title}}</h1><p>{{description}}</p>';
      const vars = [
        { key: 'title', value: 'Hello', label: '', type: 'text' as const, placeholder: '' },
        { key: 'description', value: 'World', label: '', type: 'text' as const, placeholder: '' },
      ];
      const result = applyVariables(html, vars);
      expect(result).toBe('<h1>Hello</h1><p>World</p>');
    });
  });

  describe('allFilled', () => {
    it('should return true when all variables have values', () => {
      const vars = [
        { key: 'title', value: 'Hello', label: '', type: 'text' as const, placeholder: '' },
        { key: 'description', value: 'World', label: '', type: 'text' as const, placeholder: '' },
      ];
      expect(allFilled(vars)).toBe(true);
    });

    it('should return false when any variable is empty', () => {
      const vars = [
        { key: 'title', value: 'Hello', label: '', type: 'text' as const, placeholder: '' },
        { key: 'description', value: '', label: '', type: 'text' as const, placeholder: '' },
      ];
      expect(allFilled(vars)).toBe(false);
    });

    it('should return true for empty array', () => {
      expect(allFilled([])).toBe(true);
    });

    it('should handle whitespace-only values', () => {
      const vars = [
        { key: 'title', value: '   ', label: '', type: 'text' as const, placeholder: '' },
      ];
      expect(allFilled(vars)).toBe(false);
    });
  });

  describe('keyToLabel', () => {
    it('should convert snake_case to Title Case', () => {
      expect(keyToLabel('user_name')).toBe('User Name');
    });

    it('should handle single word', () => {
      expect(keyToLabel('title')).toBe('Title');
    });

    it('should handle multiple underscores', () => {
      expect(keyToLabel('first_name_last')).toBe('First Name Last');
    });

    it('should handle all lowercase', () => {
      expect(keyToLabel('alllower')).toBe('Alllower');
    });
  });

  describe('injectVariablePlaceholders', () => {
    it('should replace Lorem ipsum with placeholder', () => {
      const html = '<p>Lorem ipsum dolor sit amet</p>';
      const result = injectVariablePlaceholders(html);
      expect(result).toBe('<p>{{body_text}}</p>');
    });

    it('should replace company name patterns', () => {
      const html = 'Welcome to your company website';
      const result = injectVariablePlaceholders(html);
      expect(result).toBe('Welcome to {{company_name}} website');
    });

    it('should replace email placeholders', () => {
      const html = 'Contact us at hello@example.com';
      const result = injectVariablePlaceholders(html);
      expect(result).toBe('Contact us at {{contact_email}}');
    });

    it('should replace URL placeholders', () => {
      const html = 'Visit https://example.com for more';
      const result = injectVariablePlaceholders(html);
      expect(result).toBe('Visit {{website_url}} for more');
    });

    it('should replace tagline placeholder', () => {
      const html = 'Your tagline here';
      const result = injectVariablePlaceholders(html);
      expect(result).toBe('{{tagline}}');
    });

    it('should replace button text', () => {
      const html = '<button>Get Started</button>';
      const result = injectVariablePlaceholders(html);
      expect(result).toBe('<button>{{cta_primary}}</button>');
    });
  });
});
