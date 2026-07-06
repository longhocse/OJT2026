SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF COL_LENGTH(N'dbo.shows', N'status') IS NULL
        ALTER TABLE dbo.shows ADD status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_shows_status DEFAULT N'scheduled';

    IF COL_LENGTH(N'dbo.shows', N'cancellation_reason') IS NULL
        ALTER TABLE dbo.shows ADD cancellation_reason NVARCHAR(500) NULL;

    IF COL_LENGTH(N'dbo.shows', N'cancelled_at') IS NULL
        ALTER TABLE dbo.shows ADD cancelled_at DATETIME2 NULL;

    IF COL_LENGTH(N'dbo.bookings', N'cancellation_reason') IS NULL
        ALTER TABLE dbo.bookings ADD cancellation_reason NVARCHAR(500) NULL;

    IF COL_LENGTH(N'dbo.bookings', N'cancelled_at') IS NULL
        ALTER TABLE dbo.bookings ADD cancelled_at DATETIME2 NULL;

    IF NOT EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.shows')
          AND name = N'CK_shows_status'
    )
        ALTER TABLE dbo.shows WITH CHECK ADD CONSTRAINT CK_shows_status
            CHECK (status IN (N'scheduled', N'cancelled'));

    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.shows')
          AND name = N'IX_shows_status_start_time'
    )
        CREATE INDEX IX_shows_status_start_time ON dbo.shows(status, start_time);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
