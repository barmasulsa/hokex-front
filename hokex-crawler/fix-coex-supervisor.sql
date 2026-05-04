-- Clear exhibit_items (주관) for all COEX events
-- Most COEX events don't have actual supervisors, and the field currently contains
-- exhibition product descriptions instead of supervisor organization names
UPDATE events
SET exhibit_items = NULL
WHERE venue = '코엑스';
