const NASHVILLE_VENUES = ["Nissan Stadium", "Nashville"];

export function isNashvilleVenue(venue: string): boolean {
  return NASHVILLE_VENUES.some((item) => venue.toLowerCase().includes(item.toLowerCase()));
}
