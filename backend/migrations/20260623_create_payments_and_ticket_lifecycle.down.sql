SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;
    IF OBJECT_ID(N'dbo.payments', N'U') IS NOT NULL DROP TABLE dbo.payments;
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.bookings') AND name = N'IX_bookings_status_expires_at')
        DROP INDEX IX_bookings_status_expires_at ON dbo.bookings;
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.bookings') AND name = N'UX_bookings_ticket_code')
        DROP INDEX UX_bookings_ticket_code ON dbo.bookings;
    IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_bookings_lifecycle_status')
        ALTER TABLE dbo.bookings DROP CONSTRAINT CK_bookings_lifecycle_status;
    IF COL_LENGTH(N'dbo.bookings', N'checked_in_at') IS NOT NULL ALTER TABLE dbo.bookings DROP COLUMN checked_in_at;
    IF COL_LENGTH(N'dbo.bookings', N'ticket_code') IS NOT NULL ALTER TABLE dbo.bookings DROP COLUMN ticket_code;
    IF COL_LENGTH(N'dbo.bookings', N'expires_at') IS NOT NULL ALTER TABLE dbo.bookings DROP COLUMN expires_at;
    UPDATE dbo.bookings SET status = N'pending' WHERE status = N'pending_payment';
    UPDATE dbo.bookings SET status = N'cancelled' WHERE status = N'expired';
    UPDATE dbo.bookings SET status = N'confirmed' WHERE status = N'used';
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
