/**
 * Unit tests for cookie parsing logic
 * Tests the getCookie method behavior based on SESSION_COOKIE_SCENARIOS.md
 * 
 * These tests replicate the getCookie logic to test all edge cases
 */

import { parseCookieFromRequest } from '../../test/helpers/cookie-parsing.helpers';

describe('Cookie Parsing Logic - Unit Tests', () => {
  describe('Category 1: Cookie Extraction from req.cookies vs Header', () => {
    describe('Scenario C1.1: Cookie Parser Middleware Present (req.cookies used)', () => {
      it('should use req.cookies when available (takes precedence over header)', () => {
        const cookies = { session: 'token-from-cookies' };
        const cookieHeader = 'session=token-from-header; other=value';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('token-from-cookies'); // req.cookies takes precedence
      });
    });

    describe('Scenario C1.2: Cookie Parser Middleware Absent (Header Parsing Used)', () => {
      it('should fall back to header parsing when req.cookies is undefined', () => {
        const cookies = undefined;
        const cookieHeader = 'session=token-from-header';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('token-from-header');
      });
    });

    describe('Scenario C1.3: req.cookies Present but Empty Object', () => {
      it('should fall back to header parsing when req.cookies is empty object', () => {
        const cookies = {};
        const cookieHeader = 'session=token-from-header';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('token-from-header');
      });
    });
  });

  describe('Category 2: Cookie Header Parsing Edge Cases', () => {
    describe('Scenario C2.1: Cookie with Empty Value', () => {
      it('should return undefined for session= (empty value treated as missing)', () => {
        const cookies = undefined;
        const cookieHeader = 'session=; other=value';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBeUndefined(); // Empty value now treated as missing (improved behavior)
      });
    });

    describe('Scenario C2.2: Cookie Name Without Equals Sign', () => {
      it('should not match cookie without equals sign', () => {
        const cookies = undefined;
        const cookieHeader = 'session; other=value';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBeUndefined();
      });
    });

    describe('Scenario C2.3: Cookie with URL-Encoded Special Characters', () => {
      it('should decode URL-encoded cookie values', () => {
        const cookies = undefined;
        const encodedValue = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9%2F.eyJzdWIiOiIxMjM0NTY3ODkwIn0';
        const cookieHeader = `session=${encodedValue}`;
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/.eyJzdWIiOiIxMjM0NTY3ODkwIn0');
      });
    });

    describe('Scenario C2.4: Cookie with Equals Sign in Value (JWT Padding)', () => {
      it('should handle JWT tokens with == padding correctly', () => {
        const cookies = undefined;
        const jwtWithPadding = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c==';
        const cookieHeader = `session=${jwtWithPadding}`;
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe(jwtWithPadding);
        expect(result?.endsWith('==')).toBe(true);
      });
    });

    describe('Scenario C2.5: Cookie Header with Extra Spaces', () => {
      it('should not match session= with spaces around equals sign', () => {
        const cookies = undefined;
        const cookieHeader = 'session = valid-token';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBeUndefined(); // Space around = breaks matching
      });

      it('should handle leading spaces in cookie header', () => {
        const cookies = undefined;
        const cookieHeader = '  session=valid-token';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('valid-token'); // Trim handles leading spaces
      });
    });

    describe('Scenario C2.6: Cookie Header with Multiple Spaces Between Cookies', () => {
      it('should handle extra spaces between cookies', () => {
        const cookies = undefined;
        const cookieHeader = 'session=token1;  other=value;  another=value';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('token1');
      });
    });

    describe('Scenario C2.7: Cookie Header with Trailing Semicolon', () => {
      it('should handle trailing semicolon', () => {
        const cookies = undefined;
        const cookieHeader = 'session=valid-token;';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('valid-token');
      });
    });

    describe('Scenario C2.8: Cookie Header with Leading Semicolon', () => {
      it('should handle leading semicolon', () => {
        const cookies = undefined;
        const cookieHeader = ';session=valid-token';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('valid-token');
      });
    });

    describe('Scenario C2.9: Cookie Header with Quotes Around Value', () => {
      it('should preserve quotes in cookie value (not stripped)', () => {
        const cookies = undefined;
        const cookieHeader = 'session="valid-token"';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('"valid-token"'); // Quotes preserved
        expect(result?.startsWith('"')).toBe(true);
        expect(result?.endsWith('"')).toBe(true);
      });
    });

    describe('Scenario C2.10: Cookie Header with Special Characters in Name', () => {
      it('should not match similar cookie names', () => {
        const cookies = undefined;
        const cookieHeader = 'session-token=value';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBeUndefined(); // session-token doesn't start with session=
      });
    });
  });

  describe('Category 3: Multiple Cookies Scenarios', () => {
    describe('Scenario C3.1: Multiple Session Cookies (Which One is Used?)', () => {
      it('should return first session cookie when multiple present', () => {
        const cookies = undefined;
        const cookieHeader = 'session=token1; session=token2; other=value';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('token1'); // .find() returns first match
      });
    });

    describe('Scenario C3.2: Session Cookie After Other Cookies', () => {
      it('should find session cookie when it comes last', () => {
        const cookies = undefined;
        const cookieHeader = 'other1=value1; other2=value2; session=valid-token';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('valid-token');
      });
    });

    describe('Scenario C3.3: Session Cookie Before Other Cookies', () => {
      it('should find session cookie when it comes first', () => {
        const cookies = undefined;
        const cookieHeader = 'session=valid-token; other1=value1; other2=value2';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('valid-token');
      });
    });

    describe('Scenario C3.4: Session Cookie in Middle of Other Cookies', () => {
      it('should find session cookie when in middle', () => {
        const cookies = undefined;
        const cookieHeader = 'other1=value1; session=valid-token; other2=value2';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('valid-token');
      });
    });
  });

  describe('Category 4: Cookie Value Extraction Edge Cases', () => {
    describe('Scenario C4.1: Cookie Value with Semicolon (Should Not Split)', () => {
      it('should only extract value up to first semicolon (parsing limitation)', () => {
        // This is a known limitation of simple parsing
        const cookies = undefined;
        const cookieHeader = 'session=token;with;semicolons; other=value';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('token'); // Only gets first part before semicolon
      });
    });

    describe('Scenario C4.2: Cookie Value with Comma', () => {
      it('should preserve comma in cookie value', () => {
        const cookies = undefined;
        const cookieHeader = 'session=token,value; other=value';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('token,value');
        expect(result?.includes(',')).toBe(true);
      });
    });

    describe('Scenario C4.3: Cookie Value with Percent Encoding', () => {
      it('should decode percent-encoded values', () => {
        const cookies = undefined;
        const cookieHeader = 'session=token%20with%20spaces';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('token with spaces');
      });
    });

    describe('Scenario C4.4: Cookie Value with Invalid Percent Encoding', () => {
      it('should return undefined for invalid percent encoding (error handled gracefully)', () => {
        const cookies = undefined;
        const cookieHeader = 'session=token%ZZinvalid';
        
        // Now returns undefined instead of throwing (improved error handling)
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        expect(result).toBeUndefined();
      });
    });
  });

  describe('Category 5: Cookie Header Format Issues', () => {
    describe('Scenario C5.1: Missing Cookie Header', () => {
      it('should return undefined when cookie header is missing', () => {
        const cookies = undefined;
        const cookieHeader = undefined;
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBeUndefined();
      });
    });

    describe('Scenario C5.2: Empty Cookie Header', () => {
      it('should return undefined for empty cookie header', () => {
        const cookies = undefined;
        const cookieHeader = '';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBeUndefined();
      });
    });

    describe('Scenario C5.3: Cookie Header with Only Whitespace', () => {
      it('should return undefined for whitespace-only header', () => {
        const cookies = undefined;
        const cookieHeader = '    ';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBeUndefined();
      });
    });
  });

  describe('Category 6: req.cookies Edge Cases', () => {
    describe('Scenario C6.1: req.cookies is null', () => {
      it('should fall back to header when req.cookies is null', () => {
        const cookies = null;
        const cookieHeader = 'session=valid-token';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('valid-token');
      });
    });

    describe('Scenario C6.2: req.cookies.session is null', () => {
      it('should fall back to header when session cookie is null', () => {
        const cookies = { session: null };
        const cookieHeader = 'session=valid-token';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('valid-token'); // Falls back to header
      });
    });

    describe('Scenario C6.3: req.cookies.session is Empty String', () => {
      it('should fall back to header when session cookie is empty string (empty string is falsy)', () => {
        const cookies = { session: '' };
        const cookieHeader = 'session=valid-token';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        // Empty string is falsy, so cookieJar[name] check fails and falls back to header
        expect(result).toBe('valid-token');
      });
    });

    describe('Scenario C6.4: req.cookies Has Other Cookies but Not Session', () => {
      it('should fall back to header when session not in req.cookies', () => {
        const cookies = { other: 'value', another: 'value2' };
        const cookieHeader = 'session=valid-token';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('valid-token');
      });
    });
  });

  describe('Category 7: decodeURIComponent Edge Cases', () => {
    describe('Scenario C7.1: Cookie Value That Needs Decoding', () => {
      it('should decode URL-encoded cookie values', () => {
        const cookies = undefined;
        const cookieHeader = 'session=eyJhbGci%2F%2F';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('eyJhbGci//');
      });
    });

    describe('Scenario C7.2: Cookie Value with Plus Sign', () => {
      it('should not decode plus sign as space (decodeURIComponent behavior)', () => {
        const cookies = undefined;
        const cookieHeader = 'session=token+with+spaces';
        
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        
        expect(result).toBe('token+with+spaces'); // Plus sign preserved
        expect(result?.includes('+')).toBe(true);
      });
    });

    describe('Scenario C7.3: decodeURIComponent Throws Error', () => {
      it('should return undefined for invalid UTF-8 sequence (error handled gracefully)', () => {
        const cookies = undefined;
        const cookieHeader = 'session=%E0%A4%A';
        
        // Now returns undefined instead of throwing (improved error handling)
        const result = parseCookieFromRequest(cookies, cookieHeader, 'session');
        expect(result).toBeUndefined();
      });
    });
  });
});

