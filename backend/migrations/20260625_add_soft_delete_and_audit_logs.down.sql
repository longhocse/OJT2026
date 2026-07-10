DROP INDEX IX_audit_logs_actor ON dbo.audit_logs;
DROP INDEX IX_audit_logs_resource ON dbo.audit_logs;
DROP INDEX IX_audit_logs_created_at ON dbo.audit_logs;
DROP INDEX IX_screens_is_active_theater ON dbo.screens;
DROP INDEX IX_theaters_is_active_name ON dbo.theaters;
DROP INDEX IX_movies_is_active_status ON dbo.movies;
GO

DROP TABLE dbo.audit_logs;
GO

ALTER TABLE dbo.screens
DROP CONSTRAINT DF_screens_is_active;
ALTER TABLE dbo.screens
DROP COLUMN is_active;
GO

ALTER TABLE dbo.theaters
DROP CONSTRAINT DF_theaters_is_active;
ALTER TABLE dbo.theaters
DROP COLUMN is_active;
GO

ALTER TABLE dbo.movies
DROP CONSTRAINT DF_movies_is_active;
ALTER TABLE dbo.movies
DROP COLUMN is_active;
GO
