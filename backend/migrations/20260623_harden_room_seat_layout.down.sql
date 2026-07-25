SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.seats')
          AND name = N'CK_seats_status'
    )
        ALTER TABLE dbo.seats DROP CONSTRAINT CK_seats_status;

    IF EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.seats')
          AND name = N'CK_seats_type'
    )
        ALTER TABLE dbo.seats DROP CONSTRAINT CK_seats_type;

    IF EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.seats')
          AND name = N'UX_seats_screen_row_number'
    )
        DROP INDEX UX_seats_screen_row_number ON dbo.seats;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
