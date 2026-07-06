ALTER TABLE dbo.movies
ADD is_active BIT NOT NULL CONSTRAINT DF_movies_is_active DEFAULT 1;
GO

ALTER TABLE dbo.theaters
ADD is_active BIT NOT NULL CONSTRAINT DF_theaters_is_active DEFAULT 1;
GO

ALTER TABLE dbo.screens
ADD is_active BIT NOT NULL CONSTRAINT DF_screens_is_active DEFAULT 1;
GO

CREATE TABLE dbo.audit_logs (
    id UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_audit_logs PRIMARY KEY
        CONSTRAINT DF_audit_logs_id DEFAULT NEWID(),
    actor_user_id UNIQUEIDENTIFIER NULL,
    action NVARCHAR(100) NOT NULL,
    resource_type NVARCHAR(100) NOT NULL,
    resource_id UNIQUEIDENTIFIER NULL,
    metadata_json NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL
        CONSTRAINT DF_audit_logs_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_audit_logs_actor
        FOREIGN KEY (actor_user_id) REFERENCES dbo.users(id) ON DELETE SET NULL
);
GO

CREATE INDEX IX_movies_is_active_status ON dbo.movies(is_active, status);
CREATE INDEX IX_theaters_is_active_name ON dbo.theaters(is_active, name);
CREATE INDEX IX_screens_is_active_theater ON dbo.screens(is_active, theater_id);
CREATE INDEX IX_audit_logs_created_at ON dbo.audit_logs(created_at DESC);
CREATE INDEX IX_audit_logs_resource ON dbo.audit_logs(resource_type, resource_id);
CREATE INDEX IX_audit_logs_actor ON dbo.audit_logs(actor_user_id, created_at DESC);
GO
