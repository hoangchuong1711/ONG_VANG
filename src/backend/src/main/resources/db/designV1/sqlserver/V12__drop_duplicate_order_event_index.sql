-- uq_order_event_sequence already indexes (ma_don, thu_tu).
-- The second index adds write cost without serving a different lookup.
DROP INDEX [ix_order_event_order_sequence] ON dbo.[nhat_ky_don_hang];
