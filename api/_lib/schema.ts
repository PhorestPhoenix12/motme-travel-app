import { doublePrecision, index, integer, jsonb, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core'

/** Investigator marks on a place-card case. Case content lives on place_cards. */
export type TripCase = {
  id: string
  placeCardId?: string | null
  unlockedHints: number
  solved: boolean
  photoKey?: string | null
  photoData?: string | null
  note: string
  liked: boolean | null
  identification?: string | null
  category?: string
  title?: string
  hints?: string[]
}

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
    cases: jsonb('cases').$type<TripCase[]>().notNull().default([]),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [unique('trips_user_city').on(table.clerkUserId, table.country, table.city)],
)

export const placeCards = pgTable(
  'place_cards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    googlePlaceId: text('google_place_id').notNull(),
    googlePlaceName: text('google_place_name').notNull(),
    address: text('address').notNull().default(''),
    city: text('city').notNull(),
    country: text('country').notNull(),
    cityKey: text('city_key').notNull(),
    countryKey: text('country_key').notNull(),
    category: text('category').notNull(),
    placeTypes: jsonb('place_types').$type<string[]>().notNull().default([]),
    primaryType: text('primary_type').notNull().default(''),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    rating: doublePrecision('rating'),
    ratingsCount: integer('ratings_count').notNull().default(0),
    googleSummary: text('google_summary').notNull().default(''),
    geminiDescription: text('gemini_description').notNull().default(''),
    title: text('title').notNull(),
    hint1: text('hint_1').notNull(),
    hint2: text('hint_2').notNull(),
    hint3: text('hint_3').notNull(),
    identityFacts: jsonb('identity_facts').$type<string[]>().notNull().default([]),
    sources: jsonb('sources').$type<Record<string, string>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [
    unique('place_cards_google_place_id').on(table.googlePlaceId),
    index('place_cards_city_category_idx').on(table.cityKey, table.countryKey, table.category),
  ],
)
