SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF EXISTS (
        SELECT 1
        FROM dbo.seats
        WHERE screen_id IS NOT NULL
        GROUP BY screen_id, seat_row, seat_number
        HAVING COUNT(*) > 1
    )
        THROW 50001, 'Duplicate seat positions exist. Resolve them before applying this migration.', 1;

    UPDATE dbo.seats
    SET type = N'standard'
    WHERE type NOT IN (N'standard', N'vip', N'couple');

    UPDATE dbo.seats
    SET status = N'available', locked_until = NULL
    WHERE status NOT IN (N'available', N'disabled');

    UPDATE screen
    SET total_seats = (
        SELECT COUNT(*) FROM dbo.seats seat WHERE seat.screen_id = screen.id
    )
    FROM dbo.screens screen;

    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.seats')
          AND name = N'UX_seats_screen_row_number'
    )
        CREATE UNIQUE INDEX UX_seats_screen_row_number
            ON dbo.seats(screen_id, seat_row, seat_number)
            WHERE screen_id IS NOT NULL;

    IF NOT EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.seats')
          AND name = N'CK_seats_type'
    )
        ALTER TABLE dbo.seats WITH CHECK ADD CONSTRAINT CK_seats_type
            CHECK (type IN (N'standard', N'vip', N'couple'));

    IF NOT EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.seats')
          AND name = N'CK_seats_status'
    )
        ALTER TABLE dbo.seats WITH CHECK ADD CONSTRAINT CK_seats_status
            CHECK (status IN (N'available', N'disabled'));

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
