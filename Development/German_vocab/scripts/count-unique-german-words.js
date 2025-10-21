// Node.js script to count unique German words in all vocab .txt files except basic.txt
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const vocabDir = path.join(__dirname, '../public/vocab');
const files = fs.readdirSync(vocabDir)
  .filter(f => f.endsWith('.txt') && f !== 'basic.txt');

const germanWords = new Set();

for (const file of files) {
  const content = fs.readFileSync(path.join(vocabDir, file), 'utf8');
  content.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//'))
    .forEach(line => {
      const sepIndex = line.indexOf(' - ');
      if (sepIndex !== -1) {
        const german = line.slice(0, sepIndex).trim();
        if (german) germanWords.add(german);
      }
    });
}

console.log(`Unique German words (excluding basic.txt): ${germanWords.size}`);
