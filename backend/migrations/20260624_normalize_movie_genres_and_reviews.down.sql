SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;
    IF COL_LENGTH(N'dbo.movies', N'genre') IS NULL ALTER TABLE dbo.movies ADD genre NVARCHAR(100) NULL;
    IF OBJECT_ID(N'dbo.movie_genres', N'U') IS NOT NULL
    BEGIN
        UPDATE movie
        SET genre = names.genre_names
        FROM dbo.movies movie
        OUTER APPLY (
            SELECT STRING_AGG(CONVERT(NVARCHAR(MAX), genre.name), N', ') AS genre_names
            FROM dbo.movie_genres link
            JOIN dbo.genres genre ON genre.id = link.genre_id
            WHERE link.movie_id = movie.id
        ) names;
        DROP TABLE dbo.movie_genres;
    END;
    IF COL_LENGTH(N'dbo.reviews', N'updated_at') IS NOT NULL
    BEGIN
        DECLARE @reviewDefault SYSNAME;
        SELECT @reviewDefault = dc.name FROM sys.default_constraints dc
        JOIN sys.columns c ON c.default_object_id = dc.object_id
        WHERE dc.parent_object_id = OBJECT_ID(N'dbo.reviews') AND c.name = N'updated_at';
        IF @reviewDefault IS NOT NULL EXEC(N'ALTER TABLE dbo.reviews DROP CONSTRAINT [' + @reviewDefault + N']');
        ALTER TABLE dbo.reviews DROP COLUMN updated_at;
    END;
    IF COL_LENGTH(N'dbo.movies', N'age_rating') IS NOT NULL ALTER TABLE dbo.movies DROP COLUMN age_rating;
    IF COL_LENGTH(N'dbo.movies', N'country') IS NOT NULL ALTER TABLE dbo.movies DROP COLUMN country;
    IF COL_LENGTH(N'dbo.movies', N'language') IS NOT NULL ALTER TABLE dbo.movies DROP COLUMN language;
    IF COL_LENGTH(N'dbo.movies', N'cast_members') IS NOT NULL ALTER TABLE dbo.movies DROP COLUMN cast_members;
    IF COL_LENGTH(N'dbo.movies', N'director') IS NOT NULL ALTER TABLE dbo.movies DROP COLUMN director;
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
