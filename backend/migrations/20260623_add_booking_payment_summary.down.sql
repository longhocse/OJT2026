SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.bookings')
          AND name = N'IX_bookings_payment_status_created_at'
    )
        DROP INDEX IX_bookings_payment_status_created_at ON dbo.bookings;

    IF EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.bookings')
          AND name = N'CK_bookings_refunded_amount'
    )
        ALTER TABLE dbo.bookings DROP CONSTRAINT CK_bookings_refunded_amount;
    IF EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.bookings')
          AND name = N'CK_bookings_payment_status'
    )
        ALTER TABLE dbo.bookings DROP CONSTRAINT CK_bookings_payment_status;

    IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_bookings_refunded_amount')
        ALTER TABLE dbo.bookings DROP CONSTRAINT DF_bookings_refunded_amount;
    IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_bookings_payment_status')
        ALTER TABLE dbo.bookings DROP CONSTRAINT DF_bookings_payment_status;

    IF COL_LENGTH(N'dbo.bookings', N'refunded_amount') IS NOT NULL
        ALTER TABLE dbo.bookings DROP COLUMN refunded_amount;
    IF COL_LENGTH(N'dbo.bookings', N'payment_status') IS NOT NULL
        ALTER TABLE dbo.bookings DROP COLUMN payment_status;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
