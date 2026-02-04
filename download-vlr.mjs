
import * as cheerio from 'cheerio';
import fs from 'fs';

async function downloadAndAnalyze(matchId) {
  console.log(`Descargando: https://www.vlr.gg/${matchId}`);
  
  const res = await fetch(`https://www.vlr.gg/${matchId}`, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  
  const html = await res.text();
  
  // Guardar HTML para inspección manual
  fs.writeFileSync(`vlr-${matchId}.html`, html);
  console.log(`✅ Guardado en vlr-${matchId}.html`);
  
  const $ = cheerio.load(html);
  
  // Buscar la fecha de forma más agresiva
  console.log("\n🔍 Buscando patrones de fecha en el HTML:");
  
  // Patrón 1: Buscar texto que contenga nombres de meses
  const monthPattern = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/gi;
  const matches = html.match(monthPattern);
  
  if (matches) {
    console.log("\n📅 Fechas encontradas en el HTML:");
    const unique = [...new Set(matches)];
    unique.forEach(m => console.log(`  - ${m}`));
  }
  
  // Patrón 2: Buscar timestamps Unix
  const timestampPattern = /data-timestamp="(\d+)"/g;
  const timestamps = [...html.matchAll(timestampPattern)];
  
  if (timestamps.length > 0) {
    console.log("\n⏰ Timestamps encontrados:");
    timestamps.forEach(t => {
      const date = new Date(parseInt(t[1]) * 1000);
      console.log(`  - ${t[1]} → ${date.toISOString()}`);
    });
  }
  
  // Patrón 3: Buscar data-utc
  const utcPattern = /data-utc="([^"]+)"/g;
  const utcs = [...html.matchAll(utcPattern)];
  
  if (utcs.length > 0) {
    console.log("\n🌍 data-utc encontrados:");
    utcs.forEach(u => console.log(`  - ${u[1]}`));
  }
  
  // Buscar en divs específicos
  console.log("\n📦 Contenido de divs clave:");
  const headerVs = $(".match-header-vs").text().trim();
  const headerDate = $(".match-header-date").text().trim();
  const headerNote = $(".match-header-vs-note").text().trim();
  
  console.log(`  - .match-header-vs: "${headerVs}"`);
  console.log(`  - .match-header-date: "${headerDate}"`);
  console.log(`  - .match-header-vs-note: "${headerNote}"`);
}

await downloadAndAnalyze('594757');
