export type PositionUpdate = {
  timestamp: number;
  speedKt: number;
  trackDeg: number;
  lat: number;
  lon: number;
};

export type Flight = {
  icao: string;
  startedAt: number;
  endedAt: number | null;
  typedesc: string | null;
  aircraftType: string | null;
  registration: string | null;
  country: string | null;
  route: string | null;
  updates: PositionUpdate[];
};

export const flights: Flight[] = [];

function activeFlight(): Flight | null {
  return flights.length > 0 ? flights[flights.length - 1] : null;
}

function nullIfBlank(val: string | null | undefined): string | null {
  if (!val || val.trim() === '' || val.trim().toLowerCase() === 'n/a') return null;
  return val.trim();
}

export function startFlight(
  icao: string,
  typedesc: string | null | undefined,
  aircraftType: string | null | undefined,
  registration: string | null | undefined,
  country: string | null | undefined,
  route: string | null | undefined,
): void {
  const prev = activeFlight();
  if (prev && prev.endedAt === null) prev.endedAt = Date.now();

  flights.push({
    icao,
    startedAt: Date.now(),
    endedAt: null,
    typedesc: nullIfBlank(typedesc),
    aircraftType: nullIfBlank(aircraftType),
    registration: nullIfBlank(registration),
    country: nullIfBlank(country),
    route: nullIfBlank(route),
    updates: [],
  });
}

export function addUpdate(update: Omit<PositionUpdate, 'timestamp'>): void {
  const flight = activeFlight();
  if (!flight) return;
  flight.updates.push({ ...update, timestamp: Date.now() });
}

export function endFlight(): void {
  const flight = activeFlight();
  if (flight) flight.endedAt = Date.now();
}

export function latestUpdate(): PositionUpdate | null {
  const flight = activeFlight();
  if (!flight || flight.updates.length === 0) return null;
  return flight.updates[flight.updates.length - 1];
}
