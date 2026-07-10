SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF COL_LENGTH(N'dbo.movies', N'director') IS NULL ALTER TABLE dbo.movies ADD director NVARCHAR(200) NULL;
    IF COL_LENGTH(N'dbo.movies', N'cast_members') IS NULL ALTER TABLE dbo.movies ADD cast_members NVARCHAR(2000) NULL;
    IF COL_LENGTH(N'dbo.movies', N'language') IS NULL ALTER TABLE dbo.movies ADD language NVARCHAR(100) NULL;
    IF COL_LENGTH(N'dbo.movies', N'country') IS NULL ALTER TABLE dbo.movies ADD country NVARCHAR(100) NULL;
    IF COL_LENGTH(N'dbo.movies', N'age_rating') IS NULL ALTER TABLE dbo.movies ADD age_rating NVARCHAR(20) NULL;
    IF COL_LENGTH(N'dbo.reviews', N'updated_at') IS NULL
        ALTER TABLE dbo.reviews ADD updated_at DATETIME2 NOT NULL
            CONSTRAINT DF_reviews_updated_at DEFAULT SYSUTCDATETIME();

    IF OBJECT_ID(N'dbo.movie_genres', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.movie_genres (
            movie_id UNIQUEIDENTIFIER NOT NULL,
            genre_id UNIQUEIDENTIFIER NOT NULL,
            CONSTRAINT PK_movie_genres PRIMARY KEY (movie_id, genre_id),
            CONSTRAINT FK_movie_genres_movie FOREIGN KEY (movie_id) REFERENCES dbo.movies(id) ON DELETE CASCADE,
            CONSTRAINT FK_movie_genres_genre FOREIGN KEY (genre_id) REFERENCES dbo.genres(id) ON DELETE CASCADE
        );
        CREATE INDEX IX_movie_genres_genre ON dbo.movie_genres(genre_id, movie_id);
    END;

    IF COL_LENGTH(N'dbo.movies', N'genre') IS NOT NULL
    BEGIN
        INSERT INTO dbo.genres (id, name, description, created_at)
        SELECT NEWID(), source.name, NULL, GETDATE()
        FROM (
            SELECT DISTINCT TRIM(parts.value) AS name
            FROM dbo.movies movie
            CROSS APPLY STRING_SPLIT(movie.genre, N',') parts
            WHERE movie.genre IS NOT NULL AND TRIM(parts.value) <> N''
        ) source
        WHERE NOT EXISTS (SELECT 1 FROM dbo.genres genre WHERE genre.name = source.name);

        INSERT INTO dbo.movie_genres (movie_id, genre_id)
        SELECT DISTINCT movie.id, genre.id
        FROM dbo.movies movie
        CROSS APPLY STRING_SPLIT(movie.genre, N',') parts
        JOIN dbo.genres genre ON genre.name = TRIM(parts.value)
        WHERE movie.genre IS NOT NULL AND TRIM(parts.value) <> N''
          AND NOT EXISTS (
              SELECT 1 FROM dbo.movie_genres link
              WHERE link.movie_id = movie.id AND link.genre_id = genre.id
          );

        ALTER TABLE dbo.movies DROP COLUMN genre;
    END;

    UPDATE movie
    SET rating = ISNULL(review_average.average_rating, 0)
    FROM dbo.movies movie
    OUTER APPLY (
        SELECT AVG(review.rating) AS average_rating
        FROM dbo.reviews review
        WHERE review.movie_id = movie.id
    ) review_average;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
