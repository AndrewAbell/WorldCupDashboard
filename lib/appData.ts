import type { GroupStanding, Match, Team } from "@/types";

export const TOURNAMENT_START_ISO = "2026-06-11T19:00:00Z";

export const teams: Team[] = [
  { id: "algeria", name: "Algeria", shortName: "Algeria", flag: "🇩🇿" },
  { id: "argentina", name: "Argentina", shortName: "Argentina", flag: "🇦🇷" },
  { id: "australia", name: "Australia", shortName: "Australia", flag: "🇦🇺" },
  { id: "austria", name: "Austria", shortName: "Austria", flag: "🇦🇹" },
  { id: "belgium", name: "Belgium", shortName: "Belgium", flag: "🇧🇪" },
  { id: "bosnia-herzegovina", name: "Bosnia and Herzegovina", shortName: "Bosnia", flag: "🇧🇦" },
  { id: "brazil", name: "Brazil", shortName: "Brazil", flag: "🇧🇷" },
  { id: "cabo-verde", name: "Cabo Verde", shortName: "Cabo Verde", flag: "🇨🇻" },
  { id: "canada", name: "Canada", shortName: "Canada", flag: "🇨🇦" },
  { id: "colombia", name: "Colombia", shortName: "Colombia", flag: "🇨🇴" },
  { id: "cote-divoire", name: "Côte d'Ivoire", shortName: "Côte d'Ivoire", flag: "🇨🇮" },
  { id: "croatia", name: "Croatia", shortName: "Croatia", flag: "🇭🇷" },
  { id: "curacao", name: "Curaçao", shortName: "Curaçao", flag: "🇨🇼" },
  { id: "czechia", name: "Czechia", shortName: "Czechia", flag: "🇨🇿" },
  { id: "dr-congo", name: "DR Congo", shortName: "DR Congo", flag: "🇨🇩" },
  { id: "ecuador", name: "Ecuador", shortName: "Ecuador", flag: "🇪🇨" },
  { id: "egypt", name: "Egypt", shortName: "Egypt", flag: "🇪🇬" },
  { id: "england", name: "England", shortName: "England", flag: "🏴" },
  { id: "france", name: "France", shortName: "France", flag: "🇫🇷" },
  { id: "germany", name: "Germany", shortName: "Germany", flag: "🇩🇪" },
  { id: "ghana", name: "Ghana", shortName: "Ghana", flag: "🇬🇭" },
  { id: "haiti", name: "Haiti", shortName: "Haiti", flag: "🇭🇹" },
  { id: "iran", name: "Iran", shortName: "Iran", flag: "🇮🇷" },
  { id: "iraq", name: "Iraq", shortName: "Iraq", flag: "🇮🇶" },
  { id: "japan", name: "Japan", shortName: "Japan", flag: "🇯🇵" },
  { id: "jordan", name: "Jordan", shortName: "Jordan", flag: "🇯🇴" },
  { id: "korea-republic", name: "Korea Republic", shortName: "Korea", flag: "🇰🇷" },
  { id: "mexico", name: "Mexico", shortName: "Mexico", flag: "🇲🇽" },
  { id: "morocco", name: "Morocco", shortName: "Morocco", flag: "🇲🇦" },
  { id: "netherlands", name: "Netherlands", shortName: "Netherlands", flag: "🇳🇱" },
  { id: "new-zealand", name: "New Zealand", shortName: "New Zealand", flag: "🇳🇿" },
  { id: "norway", name: "Norway", shortName: "Norway", flag: "🇳🇴" },
  { id: "panama", name: "Panama", shortName: "Panama", flag: "🇵🇦" },
  { id: "paraguay", name: "Paraguay", shortName: "Paraguay", flag: "🇵🇾" },
  { id: "portugal", name: "Portugal", shortName: "Portugal", flag: "🇵🇹" },
  { id: "qatar", name: "Qatar", shortName: "Qatar", flag: "🇶🇦" },
  { id: "saudi-arabia", name: "Saudi Arabia", shortName: "Saudi Arabia", flag: "🇸🇦" },
  { id: "scotland", name: "Scotland", shortName: "Scotland", flag: "🏴" },
  { id: "senegal", name: "Senegal", shortName: "Senegal", flag: "🇸🇳" },
  { id: "south-africa", name: "South Africa", shortName: "South Africa", flag: "🇿🇦" },
  { id: "spain", name: "Spain", shortName: "Spain", flag: "🇪🇸" },
  { id: "sweden", name: "Sweden", shortName: "Sweden", flag: "🇸🇪" },
  { id: "switzerland", name: "Switzerland", shortName: "Switzerland", flag: "🇨🇭" },
  { id: "tunisia", name: "Tunisia", shortName: "Tunisia", flag: "🇹🇳" },
  { id: "turkiye", name: "Türkiye", shortName: "Türkiye", flag: "🇹🇷" },
  { id: "uruguay", name: "Uruguay", shortName: "Uruguay", flag: "🇺🇾" },
  { id: "usa", name: "USA", shortName: "USMNT", flag: "🇺🇸" },
  { id: "uzbekistan", name: "Uzbekistan", shortName: "Uzbekistan", flag: "🇺🇿" }
];

export const worldCupGroups: Record<string, string[]> = {
  "Group A": ["mexico", "south-africa", "korea-republic", "czechia"],
  "Group B": ["canada", "bosnia-herzegovina", "qatar", "switzerland"],
  "Group C": ["haiti", "scotland", "brazil", "morocco"],
  "Group D": ["usa", "paraguay", "australia", "turkiye"],
  "Group E": ["cote-divoire", "ecuador", "germany", "curacao"],
  "Group F": ["netherlands", "japan", "sweden", "tunisia"],
  "Group G": ["iran", "new-zealand", "belgium", "egypt"],
  "Group H": ["saudi-arabia", "uruguay", "spain", "cabo-verde"],
  "Group I": ["france", "senegal", "iraq", "norway"],
  "Group J": ["argentina", "algeria", "austria", "jordan"],
  "Group K": ["portugal", "dr-congo", "uzbekistan", "colombia"],
  "Group L": ["ghana", "panama", "england", "croatia"]
};

const teamById = new Map(teams.map((team) => [team.id, team]));

function getTeam(id: string): Team {
  const team = teamById.get(id);
  if (!team) {
    throw new Error(`Missing team metadata for ${id}`);
  }
  return team;
}

export const officialGroupStandings: GroupStanding[] = Object.entries(worldCupGroups).map(([group, teamIds]) => ({
  group,
  playedLabel: "Pre-tournament",
  teams: teamIds.map((teamId, index) => ({
    position: index + 1,
    team: getTeam(teamId),
    played: 0,
    won: 0,
    goalDifference: 0,
    points: 0,
    form: [],
    qualifies: index < 2
  }))
}));

function fixture(
  id: string,
  date: string,
  group: string,
  homeTeamId: string,
  awayTeamId: string,
  venue: string,
  city: string
): Match {
  return {
    id,
    date,
    status: "SCHEDULED",
    group,
    stage: "Group Stage",
    venue,
    city,
    homeTeam: getTeam(homeTeamId),
    awayTeam: getTeam(awayTeamId),
    homeForm: [],
    awayForm: []
  };
}

export const officialGroupStageFixtures: Match[] = [
  fixture("wc2026-001", "2026-06-11T19:00:00Z", "Group A", "mexico", "south-africa", "Estadio Azteca", "Mexico City"),
  fixture("wc2026-002", "2026-06-12T02:00:00Z", "Group A", "korea-republic", "czechia", "Estadio Akron", "Guadalajara"),
  fixture("wc2026-003", "2026-06-12T19:00:00Z", "Group B", "canada", "bosnia-herzegovina", "BMO Field", "Toronto"),
  fixture("wc2026-004", "2026-06-13T01:00:00Z", "Group D", "usa", "paraguay", "SoFi Stadium", "Los Angeles"),
  fixture("wc2026-005", "2026-06-13T01:00:00Z", "Group C", "haiti", "scotland", "Gillette Stadium", "Boston"),
  fixture("wc2026-006", "2026-06-13T04:00:00Z", "Group D", "australia", "turkiye", "BC Place", "Vancouver"),
  fixture("wc2026-007", "2026-06-13T22:00:00Z", "Group C", "brazil", "morocco", "MetLife Stadium", "New York / New Jersey"),
  fixture("wc2026-008", "2026-06-13T19:00:00Z", "Group B", "qatar", "switzerland", "Levi's Stadium", "San Francisco Bay Area"),
  fixture("wc2026-009", "2026-06-14T23:00:00Z", "Group E", "cote-divoire", "ecuador", "Lincoln Financial Field", "Philadelphia"),
  fixture("wc2026-010", "2026-06-14T17:00:00Z", "Group E", "germany", "curacao", "NRG Stadium", "Houston"),
  fixture("wc2026-011", "2026-06-14T20:00:00Z", "Group F", "netherlands", "japan", "AT&T Stadium", "Dallas"),
  fixture("wc2026-012", "2026-06-15T02:00:00Z", "Group F", "sweden", "tunisia", "Estadio BBVA", "Monterrey"),
  fixture("wc2026-013", "2026-06-15T22:00:00Z", "Group H", "saudi-arabia", "uruguay", "Hard Rock Stadium", "Miami"),
  fixture("wc2026-014", "2026-06-15T16:00:00Z", "Group H", "spain", "cabo-verde", "Mercedes-Benz Stadium", "Atlanta"),
  fixture("wc2026-015", "2026-06-16T01:00:00Z", "Group G", "iran", "new-zealand", "SoFi Stadium", "Los Angeles"),
  fixture("wc2026-016", "2026-06-15T19:00:00Z", "Group G", "belgium", "egypt", "Lumen Field", "Seattle"),
  fixture("wc2026-017", "2026-06-16T19:00:00Z", "Group I", "france", "senegal", "MetLife Stadium", "New York / New Jersey"),
  fixture("wc2026-018", "2026-06-16T22:00:00Z", "Group I", "iraq", "norway", "Gillette Stadium", "Boston"),
  fixture("wc2026-019", "2026-06-17T01:00:00Z", "Group J", "argentina", "algeria", "GEHA Field at Arrowhead Stadium", "Kansas City"),
  fixture("wc2026-020", "2026-06-17T04:00:00Z", "Group J", "austria", "jordan", "Levi's Stadium", "San Francisco Bay Area"),
  fixture("wc2026-021", "2026-06-17T23:00:00Z", "Group L", "ghana", "panama", "BMO Field", "Toronto"),
  fixture("wc2026-022", "2026-06-17T20:00:00Z", "Group L", "england", "croatia", "AT&T Stadium", "Dallas"),
  fixture("wc2026-023", "2026-06-17T17:00:00Z", "Group K", "portugal", "dr-congo", "NRG Stadium", "Houston"),
  fixture("wc2026-024", "2026-06-18T02:00:00Z", "Group K", "uzbekistan", "colombia", "Estadio Azteca", "Mexico City")
];
