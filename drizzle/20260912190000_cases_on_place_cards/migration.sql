ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "cases" jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE trips AS t
SET cases = COALESCE((
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', qr.quest_key,
      'placeCardId', qr.place_card_id,
      'unlockedHints', qr.unlocked_hints,
      'solved', qr.solved,
      'photoKey', qr.photo_key,
      'photoData', qr.photo_data,
      'note', qr.note,
      'liked', qr.liked,
      'identification', NULL,
      'category', qr.category,
      'title', qr.title,
      'hints', qr.hints
    )
    ORDER BY qr.quest_key
  )
  FROM quest_records qr
  WHERE qr.trip_id = t.id
), '[]'::jsonb);

ALTER TABLE quest_records DROP CONSTRAINT IF EXISTS quest_records_place_card_id_place_cards_id_fk;

DROP TABLE IF EXISTS quest_records;
