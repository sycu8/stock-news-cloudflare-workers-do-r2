-- Add representative image URL for articles (prefer og:image).
ALTER TABLE articles ADD COLUMN image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_articles_image_url ON articles (image_url);
