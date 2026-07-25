SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF COL_LENGTH(N'dbo.bookings', N'payment_status') IS NULL
        ALTER TABLE dbo.bookings ADD payment_status NVARCHAR(30) NOT NULL
            CONSTRAINT DF_bookings_payment_status DEFAULT N'pending';

    IF COL_LENGTH(N'dbo.bookings', N'refunded_amount') IS NULL
        ALTER TABLE dbo.bookings ADD refunded_amount DECIMAL(10, 2) NOT NULL
            CONSTRAINT DF_bookings_refunded_amount DEFAULT 0;

    UPDATE dbo.bookings
    SET payment_status = CASE
            WHEN status = N'confirmed' THEN N'paid'
            WHEN status = N'cancelled' THEN N'refunded'
            ELSE N'pending'
        END,
        refunded_amount = CASE WHEN status = N'cancelled' THEN total_price ELSE 0 END;

    IF NOT EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.bookings')
          AND name = N'CK_bookings_payment_status'
    )
        ALTER TABLE dbo.bookings WITH CHECK ADD CONSTRAINT CK_bookings_payment_status
            CHECK (payment_status IN (
                N'pending', N'paid', N'failed', N'cancelled',
                N'partially_refunded', N'refunded'
            ));

    IF NOT EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.bookings')
          AND name = N'CK_bookings_refunded_amount'
    )
        ALTER TABLE dbo.bookings WITH CHECK ADD CONSTRAINT CK_bookings_refunded_amount
            CHECK (refunded_amount >= 0 AND refunded_amount <= total_price);

    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.bookings')
          AND name = N'IX_bookings_payment_status_created_at'
    )
        CREATE INDEX IX_bookings_payment_status_created_at
            ON dbo.bookings(payment_status, created_at DESC);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
