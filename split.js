const fs = require('fs');

const filePath = '/Users/fikri/Aplikasi/apps-kes/apps/web/src/app/(app)/laporan-builder/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// The file is one giant line. The original had newlines before being collapsed.
// Strategy: Walk through tokens and insert newlines based on structure.

// Simple approach: insert newline after every `; ` (semicolon-space that ends a statement)
// and before certain keywords. But need to handle strings/templates carefully.

// Even simpler: The original file was well-formatted code that got collapsed to one line.
// We can split it by inserting newlines at `  ` (2-space indent boundary) since the original
// code used 2-space indentation. When collapsed, `;  ` became `;  ` with the indent preserved.

// Looking at the data: `};  const` - the original had newline + 2 spaces between statements
// So splitting on `  ` (double space that represents original indentation) should work.

// But JSX has spaces in className strings, so we need to be careful.
// Best approach: split on `;  ` → `;\n  ` and on `{  ` → `{\n  ` etc.

// Let me just do a more aggressive line-break approach:
// Replace `  ` (2+ spaces) with newlines when they appear after certain patterns

// Actually the simplest reliable approach: tokenize and split

function splitLines(src) {
  let result = '';
  let i = 0;
  let inStr = false;
  let strChar = '';
  let inTemplate = false;
  let braceDepth = 0; // track ${} inside templates
  let inJsx = false;
  let jsxDepth = 0;
  
  while (i < src.length) {
    const ch = src[i];
    const next = src[i+1];
    const prev = result[result.length - 1];
    
    // Handle string literals
    if (inStr) {
      result += ch;
      if (ch === '\\' && i + 1 < src.length) {
        result += src[i+1];
        i += 2;
        continue;
      }
      if (ch === strChar) inStr = false;
      i++;
      continue;
    }
    
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = true;
      strChar = ch;
      result += ch;
      i++;
      continue;
    }
    
    // Line comment
    if (ch === '/' && next === '/') {
      let end = src.indexOf('\n', i);
      if (end === -1) end = src.length;
      // There's no newline since it's all one line - look for next statement start
      // Comments in the collapsed file: `// comment  const` or `// comment }`
      // Find the end of comment - it goes until the next `  ` (2-space indent) that's a statement boundary
      // Actually let's just find common next-line patterns
      let commentEnd = i + 2;
      // comment ends when we hit a pattern that starts a new line
      while (commentEnd < src.length) {
        // Check if we're at a 2-space indent boundary followed by a keyword
        if (src.slice(commentEnd - 2, commentEnd) === '  ' && 
            /^(const |let |var |if |for |while |switch |return|type |\/\/|import |export |function |}\s|{)/.test(src.slice(commentEnd, commentEnd + 10))) {
          break;
        }
        commentEnd++;
      }
      result += '\n' + src.slice(i, commentEnd);
      i = commentEnd;
      continue;
    }
    
    // JSX comments {/* */}
    if (ch === '{' && next === '/' && src[i+2] === '*') {
      let end = src.indexOf('*/', i);
      if (end !== -1) {
        result += '\n' + src.slice(i, end + 2);
        i = end + 2;
        continue;
      }
    }
    
    // After semicolons - end of statement
    if (ch === ';') {
      result += ch;
      // skip whitespace
      while (i + 1 < src.length && src[i+1] === ' ') i++;
      if (i + 1 < src.length && src[i+1] !== '}' && src[i+1] !== ')' && src[i+1] !== ']') {
        result += '\n';
      }
      i++;
      continue;
    }
    
    // After opening brace
    if (ch === '{') {
      result += ch;
      while (i + 1 < src.length && src[i+1] === ' ') i++;
      result += '\n';
      i++;
      continue;
    }
    
    // Before closing brace
    if (ch === '}') {
      while (result.endsWith(' ') || result.endsWith('\n')) {
        result = result.slice(0, -1);
      }
      result += '\n' + ch;
      i++;
      continue;
    }
    
    // Before opening JSX tag (not in expression)
    if (ch === '<' && next !== '=' && next !== ' ' && !inStr) {
      // check if previous non-space char suggests we're at statement start or after another tag
      result += '\n';
      result += ch;
      i++;
      continue;
    }
    
    result += ch;
    i++;
  }
  
  return result;
}

// Actually, let me take a completely different approach.
// The file content already has the proper code, just on 1 line with `  ` (double spaces) 
// representing indentation. Let me just replace `  ` (two spaces) with newlines in 
// strategic places.

// The original file had 2-space indentation. When collapsed:
// - `;\n  ` became `;  ` 
// - `{\n  ` became `{  `
// - `}\n` became `}  ` or `} `
// etc.

// So: replace `;  ` with `;\n  ` and `{  ` with `{\n  ` etc.
// But be careful with strings.

// Simplest: just do string-aware replacements
function smartSplit(src) {
  let out = [];
  let i = 0;
  let inStr = false;
  let strChar = '';
  
  let buf = '';
  
  while (i < src.length) {
    const ch = src[i];
    
    if (inStr) {
      buf += ch;
      if (ch === '\\') { buf += src[i+1]; i += 2; continue; }
      if (ch === strChar) inStr = false;
      i++;
      continue;
    }
    
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = true;
      strChar = ch;
      buf += ch;
      i++;
      continue;
    }
    
    // Semicolon followed by space(s) - end of statement
    if (ch === ';') {
      buf += ';';
      i++;
      // consume trailing spaces
      while (i < src.length && src[i] === ' ') i++;
      buf += '\n  ';
      continue;
    }
    
    // Opening brace followed by space
    if (ch === '{') {
      buf += '{';
      i++;
      while (i < src.length && src[i] === ' ') i++;
      buf += '\n  ';
      continue;
    }
    
    // Closing brace
    if (ch === '}') {
      // trim trailing spaces from buf
      while (buf.endsWith(' ')) buf = buf.slice(0, -1);
      buf += '\n}';
      i++;
      // consume trailing spaces
      while (i < src.length && src[i] === ' ') i++;
      // add newline if next char is not closing paren/brace
      if (i < src.length && src[i] !== ')' && src[i] !== ']' && src[i] !== ',' && src[i] !== ';') {
        buf += '\n  ';
      }
      continue;
    }
    
    buf += ch;
    i++;
  }
  
  return buf;
}

let result = smartSplit(content);

// Write to temp file for inspection
fs.writeFileSync('/tmp/split-output.tsx', result);
console.log("Lines:", result.split('\n').length);
console.log("First 500 chars:", result.slice(0, 500));
