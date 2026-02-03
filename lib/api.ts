export interface Match {
  id: string;
  team1: string;
  team2: string;
  score1: string;
  score2: string;
  time: string;
  status: 'Upcoming' | 'Live' | 'Completed';
}

export async function getUpcomingMatches(): Promise<Match[]> {
  // Mock data for initial development
  // In the future, this will scrape VLR.gg or use an API
  return [
    {
      id: '1',
      team1: 'Fnatic',
      team2: 'Team Liquid',
      score1: '-',
      score2: '-',
      time: '2024-04-04T18:00:00Z',
      status: 'Upcoming',
    },
    {
      id: '2',
      team1: 'NAVI',
      team2: 'Karmine Corp',
      score1: '-',
      score2: '-',
      time: '2024-04-04T21:00:00Z',
      status: 'Upcoming',
    },
  ];
}
