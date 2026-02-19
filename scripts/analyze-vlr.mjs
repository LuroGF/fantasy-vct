
import * as cheerio from 'cheerio';

async function analyzeVlrPage(matchId) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Analizando: https://www.vlr.gg/${matchId}`);
  console.log('='.repeat(60));
  
  try {
    const res = await fetch(`https://www.vlr.gg/${matchId}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    
    if (!res.ok) {
      console.log("❌ Página no accesible");
      return;
    }
    
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Equipos
    const teams = $(".match-header-link-name").map((_, el) => $(el).text().trim()).get();
    console.log(`\n📋 Equipos: ${teams.join(' vs ')}`);
    
    // Buscar TODOS los elementos con clase que contenga "date", "time", "moment"
    console.log("\n🔍 Buscando elementos de fecha/hora:");
    
    $("[class*='date'], [class*='time'], [class*='moment'], [data-utc]").each((_, el) => {
      const classes = $(el).attr('class') || '';
      const dataUtc = $(el).attr('data-utc');
      const text = $(el).text().trim();
      
      if (dataUtc || text) {
        console.log(`  - Clase: "${classes}"`);
        if (dataUtc) console.log(`    data-utc: ${dataUtc}`);
        if (text) console.log(`    Texto: ${text}`);
      }
    });
    
    // Buscar en el header del match
    console.log("\n📅 Match Header Info:");
    const headerDate = $(".match-header-date").text().trim();
    const headerNote = $(".match-header-vs-note").text().trim();
    const headerSuper = $(".match-header-super").text().trim();
    
    if (headerDate) console.log(`  - header-date: ${headerDate}`);
    if (headerNote) console.log(`  - header-vs-note: ${headerNote}`);
    if (headerSuper) console.log(`  - header-super: ${headerSuper}`);
    
    // Buscar scripts que puedan contener datos JSON
    console.log("\n🔧 Buscando datos en scripts...");
    $("script").each((_, el) => {
      const scriptContent = $(el).html() || '';
      if (scriptContent.includes('match') && scriptContent.includes('date')) {
        const snippet = scriptContent.substring(0, 200);
        console.log(`  - Encontrado script con 'match' y 'date': ${snippet}...`);
      }
    });
    
  } catch (e) {
    console.error("❌ Error:", e.message);
  }
}

// Analizar solo el primero para ver el formato
await analyzeVlrPage('594757');
