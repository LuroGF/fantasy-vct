
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, ".env.local");

// Manual env load (no dotenv)
let env = {};
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    lines.forEach(line => {
        const [key, ...vals] = line.split("=");
        if (key && vals.length) env[key.trim()] = vals.join("=").trim();
    });
}

const supabaseUrl = env["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseKey = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking DB schema...");
    const { data, error } = await supabase.from('user_rosters').select('is_starter').limit(1);
    
    if (error) {
        console.error("Column Check Error:", error.message);
        if (error.message.includes("is_starter")) {
            console.log("--> Column 'is_starter' DOES NOT EXIST.");
        }
    } else {
        console.log("--> Column 'is_starter' EXISTS.");
    }
}

check();
