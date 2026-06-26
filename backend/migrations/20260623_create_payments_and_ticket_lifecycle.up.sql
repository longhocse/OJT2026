SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    UPDATE dbo.bookings SET status = N'pending_payment' WHERE status = N'pending';

    IF COL_LENGTH(N'dbo.bookings', N'expires_at') IS NULL
        ALTER TABLE dbo.bookings ADD expires_at DATETIME2 NULL;
    IF COL_LENGTH(N'dbo.bookings', N'ticket_code') IS NULL
        ALTER TABLE dbo.bookings ADD ticket_code NVARCHAR(40) NULL;
    IF COL_LENGTH(N'dbo.bookings', N'checked_in_at') IS NULL
        ALTER TABLE dbo.bookings ADD checked_in_at DATETIME2 NULL;

    UPDATE dbo.bookings
    SET ticket_code = N'MT-' + UPPER(REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N''))
    WHERE ticket_code IS NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_bookings_lifecycle_status')
        ALTER TABLE dbo.bookings WITH CHECK ADD CONSTRAINT CK_bookings_lifecycle_status
            CHECK (status IN (N'pending_payment', N'confirmed', N'cancelled', N'expired', N'used'));

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.bookings') AND name = N'UX_bookings_ticket_code')
        CREATE UNIQUE INDEX UX_bookings_ticket_code ON dbo.bookings(ticket_code) WHERE ticket_code IS NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.bookings') AND name = N'IX_bookings_status_expires_at')
        CREATE INDEX IX_bookings_status_expires_at ON dbo.bookings(status, expires_at);

    IF OBJECT_ID(N'dbo.payments', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.payments (
            id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_payments PRIMARY KEY CONSTRAINT DF_payments_id DEFAULT NEWID(),
            booking_id UNIQUEIDENTIFIER NOT NULL,
            provider NVARCHAR(30) NOT NULL,
            provider_transaction_id NVARCHAR(100) NULL,
            amount DECIMAL(10,2) NOT NULL,
            status NVARCHAR(30) NOT NULL CONSTRAINT DF_payments_status DEFAULT N'pending',
            idempotency_key UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_payments_idempotency_key DEFAULT NEWID(),
            paid_at DATETIME2 NULL,
            failed_at DATETIME2 NULL,
            refunded_amount DECIMAL(10,2) NOT NULL CONSTRAINT DF_payments_refunded_amount DEFAULT 0,
            created_at DATETIME2 NOT NULL CONSTRAINT DF_payments_created_at DEFAULT SYSUTCDATETIME(),
            updated_at DATETIME2 NOT NULL CONSTRAINT DF_payments_updated_at DEFAULT SYSUTCDATETIME(),
            CONSTRAINT UQ_payments_booking UNIQUE (booking_id),
            CONSTRAINT UQ_payments_idempotency_key UNIQUE (idempotency_key),
            CONSTRAINT FK_payments_booking FOREIGN KEY (booking_id) REFERENCES dbo.bookings(id) ON DELETE CASCADE,
            CONSTRAINT CK_payments_status CHECK (status IN (N'pending',N'paid',N'failed',N'cancelled',N'partially_refunded',N'refunded')),
            CONSTRAINT CK_payments_amount CHECK (amount > 0),
            CONSTRAINT CK_payments_refunded_amount CHECK (refunded_amount >= 0 AND refunded_amount <= amount)
        );
        CREATE UNIQUE INDEX UX_payments_provider_transaction_id
            ON dbo.payments(provider_transaction_id) WHERE provider_transaction_id IS NOT NULL;
        CREATE INDEX IX_payments_status_created_at ON dbo.payments(status, created_at DESC);
    END;

    INSERT INTO dbo.payments (
        booking_id, provider, amount, status, idempotency_key, paid_at, refunded_amount
    )
    SELECT booking.id, N'legacy', booking.total_price,
        CASE
            WHEN booking.payment_status = N'refunded' THEN N'refunded'
            WHEN booking.payment_status = N'partially_refunded' THEN N'partially_refunded'
            WHEN booking.payment_status = N'failed' THEN N'failed'
            WHEN booking.payment_status = N'cancelled' THEN N'cancelled'
            WHEN booking.payment_status = N'pending' THEN N'pending'
            ELSE N'paid'
        END,
        NEWID(),
        CASE WHEN booking.payment_status IN (N'paid',N'partially_refunded',N'refunded') THEN booking.created_at ELSE NULL END,
        booking.refunded_amount
    FROM dbo.bookings booking
    WHERE NOT EXISTS (SELECT 1 FROM dbo.payments payment WHERE payment.booking_id = booking.id);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
