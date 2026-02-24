import { getScoutingPlayers } from "@/lib/actions/players";
import PlayersView from "@/app/players/PlayersView";
import ClientRefreshWrapper from "@/components/ClientRefreshWrapper";

export default async function ScoutingPage() {
    const players = await getScoutingPlayers();
    
    return (
        <ClientRefreshWrapper>
            <main className="min-h-screen pb-24 mx-auto w-full max-w-md sm:max-w-xl lg:max-w-4xl px-4 sm:px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <PlayersView initialPlayers={players} />
            </main>
        </ClientRefreshWrapper>
    );
}
