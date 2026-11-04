import { geometry, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';

// WGS84 coordinates are separate from Phaser world coordinates.
export const places = pgTable('places', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
}, (table) => [index('places_location_gist').using('gist', table.location)]);
