
import * as cheerio from 'cheerio';
import fs from 'fs';

const target = process.argv[2] || '594757';
const url = target.startsWith('http') ? target : `https://www.vlr.gg/${target}`;

async function downloadAndAnalyze() {
  console.log(`Descargando: ${url}`);
  
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  
  const html = await res.text();
  
  const fileName = target.replace(/[^a-z0-9]/gi, '_') + '.html';
  fs.writeFileSync(fileName, html);
  console.log(`✅ Guardado en ${fileName}`);
}

await downloadAndAnalyze();
