import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkMatches() {
  const { data: matches, error } = await supabase
    .from('matches')
    .select(`
      id,
      vlr_id,
      match_date,
      status,
      team_a:pro_teams!team_a(name),
      team_b:pro_teams!team_b(name)
    `)
    .order('match_date', { ascending: true })

  if (error) {
    console.error('Error fetching matches:', error)
    return
  }

  console.log(`Found ${matches.length} matches in DB:`)
  matches.forEach(m => {
    console.log(`- [${m.status}] ${m.team_a.name} vs ${m.team_b.name} (${m.match_date}) [VLR:${m.vlr_id}]`)
  })
}

checkMatches()
