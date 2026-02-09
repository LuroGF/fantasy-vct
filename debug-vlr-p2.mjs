
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// Duplicate logic or import if possible. Since importing TS from MJS is tricky without setup, 
// I will just use a temporary script that does the fetch for page 2 specifically.

async function syncPage2() {
    const url = "https://www.vlr.gg/matches/?page=2";
    console.log("Fetching page 2...");
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const matches = [];
    $(".wf-label.mod-large").each((_, label) => {
        const date = $(label).text().trim();
        let next = $(label).next();
        while (next.length && !next.hasClass("wf-label")) {
            const processItem = (item) => {
                const card = $(item);
                const event = card.find(".match-item-event").first().text().trim();
                const teams = card.find(".match-item-vs-team-name").map((i, t) => $(t).text().trim()).get();
                matches.push({ date, event, teams: teams.join(" vs ") });
            };
            if (next.hasClass("match-item")) processItem(next);
            else next.find(".match-item").each((i, it) => processItem(it));
            next = next.next();
        }
    });

    console.log(`Found ${matches.length} matches on page 2.`);
    matches.filter(m => m.event.toUpperCase().includes("VCT")).forEach(m => {
        console.log(`- [${m.date}] ${m.event} | ${m.teams}`);
    });
}

syncPage2();
