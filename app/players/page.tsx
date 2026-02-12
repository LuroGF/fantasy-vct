"use server";

import { getScoutingPlayers } from "@/lib/actions/players";
import PlayersView from "@/app/players/PlayersView";

export default async function ScoutingPage() {
    const players = await getScoutingPlayers();
    
    return (
        <main className="min-h-screen pb-24">
            <PlayersView initialPlayers={players} />
        </main>
    );
}
