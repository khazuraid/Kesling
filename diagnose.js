const fs = require('fs');

const filePath = '/Users/fikri/Aplikasi/apps-kes/apps/web/src/app/(app)/laporan-builder/page.tsx';
const content = fs.readFileSync(filePath, 'utf8');

// Count braces to understand the issue
let braceDepth = 0;
let pos = 0;
for (let i = 0; i < content.length; i++) {
  const ch = content[i];
  // skip string literals
  if (ch === '"' || ch === "'" || ch === '`') {
    const quote = ch;
    i++;
    while (i < content.length && content[i] !== quote) {
      if (content[i] === '\\') i++;
      i++;
    }
    continue;
  }
  // skip regex
  if (ch === '/') {
    if (i + 1 < content.length && content[i+1] === '/' && content[i+2] === '/') continue; // comment line
    if (content[i+1] === '/') { i++; continue; }
  }
  if (ch === '{') braceDepth++;
  if (ch === '}') braceDepth--;
  if (ch === '(') braceDepth++;
  if (ch === ')') braceDepth--;
  if (ch === '[') braceDepth++;
  if (ch === ']') braceDepth--;
}

// Also count just curly braces
let curlyDepth = 0;
let parenDepth = 0;
let bracketDepth = 0;
let inString = false;
let stringChar = '';
for (let i = 0; i < content.length; i++) {
  const ch = content[i];
  if (inString) {
    if (ch === '\\') { i++; continue; }
    if (ch === stringChar) { inString = false; }
    continue;
  }
  if (ch === '"' || ch === "'" || ch === '`') {
    inString = true;
    stringChar = ch;
    continue;
  }
  // skip template literal
  if (ch === '{') curlyDepth++;
  if (ch === '}') curlyDepth--;
  if (ch === '(') parenDepth++;
  if (ch === ')') parenDepth--;
  if (ch === '[') bracketDepth++;
  if (ch === ']') bracketDepth--;
}

console.log("Curly braces net:", curlyDepth);
console.log("Parens net:", parenDepth);
console.log("Brackets net:", bracketDepth);

// Show position of last 10 braces
let last10 = [];
for (let i = content.length - 1; i >= 0 && last10.length < 20; i--) {
  if (content[i] === '{' || content[i] === '}' || content[i] === '(' || content[i] === ')' || content[i] === '[' || content[i] === ']') {
    last10.push({pos: i, char: content[i]});
  }
}
console.log("Last braces:", last10.reverse());

// Extract the section I want to see - from "PARAMETER" tab JSX to end
let paramTabIdx = content.indexOf('activeTab === "parameter"');
if (paramTabIdx > -1) {
  console.log("\n=== From parameter tab to end ===");
  console.log(content.slice(paramTabIdx, paramTabIdx + 500));
  console.log("\n... last 1000 chars ...");
  console.log(content.slice(-1000));
}
