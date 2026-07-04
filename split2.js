const fs = require('fs');

const filePath = '/Users/fikri/Aplikasi/apps-kes/apps/web/src/app/(app)/laporan-builder/page.tsx';
const content = fs.readFileSync(filePath, 'utf8');

// Split into chunks of ~3000 chars and write each to a line-numbered file
// But first, let me do a better split that handles comments

function betterSplit(src) {
  let result = '';
  let i = 0;
  let inStr = false;
  let strChar = '';
  
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    
    // Handle string literals
    if (inStr) {
      result += ch;
      if (ch === '\\') { result += src[i + 1] || ''; i += 2; continue; }
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
    
    // Handle line comments // ... 
    // The comment runs until we hit the original line break, which in collapsed form
    // is represented by `  ` (2+ spaces) followed by a statement/keyword
    if (ch === '/' && next === '/') {
      let j = i + 2;
      // Find the end of the comment - look for `  ` followed by a keyword or code
      // The comment text itself shouldn't contain `  ` followed by a keyword typically
      while (j < src.length) {
        // Check for pattern: 2+ spaces followed by a code token
        if (src[j] === ' ' && src[j + 1] === ' ') {
          // Look ahead past spaces to see if it's code
          let k = j;
          while (k < src.length && src[k] === ' ') k++;
          const ahead = src.slice(k, k + 20);
          // If it looks like code (not more comment text), break here
          if (/^(const |let |var |if |for |while |switch |return|type |import |export |function |[A-Za-z_$])/) {
            if (ahead.startsWith('//') || ahead.startsWith('/*')) {
              j = k;
              break;
            }
            // Check it's not just part of the comment text
            if (/^(const |let |var |type |import |export |function |return)/) {
              j = k;
              break;
            }
          }
        }
        j++;
      }
      result += src.slice(i, j);
      result += '\n';
      i = j;
      continue;
    }
    
    // Handle JSX comments {/* ... */}
    if (ch === '{' && next === '/' && src[i + 2] === '*') {
      let end = src.indexOf('*/', i + 3);
      if (end !== -1) {
        result += src.slice(i, end + 2);
        i = end + 2;
        continue;
      }
    }
    
    // Semicolon followed by spaces = end of statement
    if (ch === ';') {
      result += ';';
      i++;
      while (i < src.length && src[i] === ' ') i++;
      // Don't add newline if we're inside JSX expression or before closing bracket
      if (i < src.length && src[i] !== '}' && src[i] !== ')' && src[i] !== ']') {
        result += '\n';
      }
      continue;
    }
    
    // Opening brace followed by spaces
    if (ch === '{') {
      result += '{';
      i++;
      // Don't add newline for inline objects like { "Content-Type": "application/json" }
      // Heuristic: if next non-space is a string key followed by colon, it's inline
      let k = i;
      while (k < src.length && src[k] === ' ') k++;
      const ahead = src.slice(k, k + 30);
      
      // Inline object: { "key": ... or { key: ... 
      const isInlineObject = /^["']?[a-zA-Z_]/.test(ahead) && !ahead.startsWith('//');
      // Template literal expression: ${...}
      // Arrow function body: => {  
      
      if (isInlineObject && !ahead.includes('()') && !ahead.startsWith('async')) {
        // Keep inline - don't add newline
        result += ' ';
        while (i < src.length && src[i] === ' ') i++;
      } else {
        while (i < src.length && src[i] === ' ') i++;
        result += '\n';
      }
      continue;
    }
    
    // Closing brace
    if (ch === '}') {
      // Trim trailing whitespace from result
      while (result.endsWith(' ')) result = result.slice(0, -1);
      result += '\n}';
      i++;
      // Skip trailing spaces
      while (i < src.length && src[i] === ' ') i++;
      // If next is , or ) or ] or ; keep on same line
      if (i < src.length && src[i] !== ')' && src[i] !== ']' && src[i] !== ',' && src[i] !== ';' && src[i] !== '.') {
        result += '\n';
      } else if (i < src.length && src[i] === ',') {
        result += ',';
        i++;
        while (i < src.length && src[i] === ' ') i++;
        result += '\n';
      }
      continue;
    }
    
    result += ch;
    i++;
  }
  
  return result;
}

let result = betterSplit(content);
fs.writeFileSync('/tmp/better-split.tsx', result);
console.log("Lines:", result.split('\n').length);
