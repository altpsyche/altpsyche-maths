/**
 * Writes each demo's committed picture. A picture in a README that nothing
 * regenerates goes stale in silence, and the gate that reads these files is what
 * says the code still draws them.
 */
import { writeFileSync } from 'node:fs';
import { figures, sheets } from './render.js';

for (const sheet of sheets) {
  const markup = sheet.markup();
  writeFileSync(sheet.file, `${markup}\n`);
  console.log(`${sheet.file} ${markup.length} bytes`);
}

for (const figure of figures) {
  const text = figure.text();
  writeFileSync(figure.file, text);
  console.log(`${figure.file} ${text.length} bytes`);
}
