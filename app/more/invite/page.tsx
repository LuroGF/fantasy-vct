import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/auth";
import { getUserLeagues } from "@/lib/actions/leagues";
import InviteView from "./InviteView";

type LeagueRelation = {
  id: string;
  name: string;
  invite_code: string;
};

export default async function InvitePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const participations = await getUserLeagues(session.user.id);
  const leagues = participations.flatMap((participation) => {
    const relation = participation.leagues as LeagueRelation | LeagueRelation[] | null;
    const league = Array.isArray(relation) ? relation[0] : relation;
    return league?.invite_code
      ? [{ id: league.id, name: league.name, inviteCode: league.invite_code }]
      : [];
  });

  return <InviteView leagues={leagues} />;
}
