import { boolean, integer, jsonb, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core'

export const usersTable = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
})

export const profiles = pgTable('profiles', {
  clerkUserId: text('clerk_user_id').primaryKey(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email').notNull(),
  phone: text('phone'),
  visitedCities: jsonb('visited_cities').$type<string[]>().notNull().default([]),
  interests: jsonb('interests').$type<Record<string, string[]>>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const trips = pgTable(
  'trips',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clerkUserId: text('clerk_user_id').notNull(),
    country: text('country').notNull(),
    city: text('city').notNull(),
    keys: integer('keys').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [unique('trips_user_city').on(table.clerkUserId, table.country, table.city)],
)

export const questRecords = pgTable(
  'quest_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    questKey: text('quest_key').notNull(),
    category: text('category').notNull(),
    title: text('title').notNull(),
    hints: jsonb('hints').$type<string[]>().notNull(),
    unlockedHints: integer('unlocked_hints').notNull().default(1),
    solved: boolean('solved').notNull().default(false),
    photoKey: text('photo_key'),
    photoData: text('photo_data'),
    note: text('note').notNull().default(''),
    liked: boolean('liked'),
  },
  table => [unique('quest_records_trip_key').on(table.tripId, table.questKey)],
)
