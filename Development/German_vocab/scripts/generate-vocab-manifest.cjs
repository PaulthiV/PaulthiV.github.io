// Script to generate vocab_manifest.json listing all .txt files in public/vocab/
const fs = require('fs');
const path = require('path');

const vocabDir = path.join(__dirname, '../public/vocab');
const manifestPath = path.join(vocabDir, 'vocab_manifest.json');

fs.readdir(vocabDir, (err, files) => {
  if (err) {
    console.error('Error reading vocab directory:', err);
    process.exit(1);
  }
  const txtFiles = files.filter(f => f.endsWith('.txt'));
  fs.writeFile(
    manifestPath,
    JSON.stringify(txtFiles, null, 2) + '\n',
    err => {
      if (err) {
        console.error('Error writing manifest:', err);
        process.exit(1);
      }
      console.log(`Manifest generated with ${txtFiles.length} files.`);
    }
  );
});
