
import * as cheerio from 'cheerio';

async function testVlrId(matchId) {
  console.log(`\nProbando VLR ID: ${matchId}`);
  console.log(`URL: https://www.vlr.gg/${matchId}`);
  
  try {
    const res = await fetch(`https://www.vlr.gg/${matchId}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    
    console.log(`Status: ${res.status}`);
    
    if (!res.ok) {
      console.log("❌ La página no existe o no es accesible");
      return;
    }
    
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Buscar diferentes formatos de fecha
    const momentTz = $(".moment-tz-convert").attr("data-utc");
    const matchHeader = $(".match-header-date").text().trim();
    const matchTime = $(".match-header-vs-note").text().trim();
    
    console.log("Datos encontrados:");
    console.log("  - moment-tz data-utc:", momentTz || "NO ENCONTRADO");
    console.log("  - match-header-date:", matchHeader || "NO ENCONTRADO");
    console.log("  - match-header-vs-note:", matchTime || "NO ENCONTRADO");
    
    // Buscar equipos
    const teams = $(".match-header-link-name").map((_, el) => $(el).text().trim()).get();
    console.log("  - Equipos:", teams.length > 0 ? teams : "NO ENCONTRADO");
    
  } catch (e) {
    console.error("Error:", e.message);
  }
}

// Probar los 4 IDs
const ids = ['594757', '594758', '594763', '594764'];
for (const id of ids) {
  await testVlrId(id);
}
