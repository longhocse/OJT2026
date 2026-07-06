SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.shows')
          AND name = N'IX_shows_status_start_time'
    )
        DROP INDEX IX_shows_status_start_time ON dbo.shows;

    IF EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.shows')
          AND name = N'CK_shows_status'
    )
        ALTER TABLE dbo.shows DROP CONSTRAINT CK_shows_status;

    IF COL_LENGTH(N'dbo.bookings', N'cancelled_at') IS NOT NULL
        ALTER TABLE dbo.bookings DROP COLUMN cancelled_at;
    IF COL_LENGTH(N'dbo.bookings', N'cancellation_reason') IS NOT NULL
        ALTER TABLE dbo.bookings DROP COLUMN cancellation_reason;
    IF COL_LENGTH(N'dbo.shows', N'cancelled_at') IS NOT NULL
        ALTER TABLE dbo.shows DROP COLUMN cancelled_at;
    IF COL_LENGTH(N'dbo.shows', N'cancellation_reason') IS NOT NULL
        ALTER TABLE dbo.shows DROP COLUMN cancellation_reason;
    IF COL_LENGTH(N'dbo.shows', N'status') IS NOT NULL
    BEGIN
        IF EXISTS (
            SELECT 1 FROM sys.default_constraints
            WHERE parent_object_id = OBJECT_ID(N'dbo.shows')
              AND name = N'DF_shows_status'
        )
            ALTER TABLE dbo.shows DROP CONSTRAINT DF_shows_status;
        ALTER TABLE dbo.shows DROP COLUMN status;
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
