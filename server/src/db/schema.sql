-- ============================================================================
-- JADOO TRAVEL RELATIONAL DATABASE SCHEMA (POSTGRESQL)
-- ============================================================================

-- 1. Users Table (Authentication, Profiles & Credentials)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'traveler' CHECK (role IN ('traveler', 'admin')),
    bio TEXT,
    phone VARCHAR(50),
    home_city VARCHAR(100),
    passport_number VARCHAR(100),
    travel_style VARCHAR(50) NOT NULL DEFAULT 'adventure', -- adventure, luxury, cultural, relaxing
    seat_preference VARCHAR(50) NOT NULL DEFAULT 'window', -- window, aisle
    dietary_requirements VARCHAR(100) NOT NULL DEFAULT 'standard',
    points INT NOT NULL DEFAULT 1250 CHECK (points >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Destinations Table (World Trips, Coordinates & Pricing)
CREATE TABLE IF NOT EXISTS destinations (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'rome-italy', 'london-uk'
    title VARCHAR(150) NOT NULL,
    country VARCHAR(100) NOT NULL,
    price_usd NUMERIC(10, 2) NOT NULL CHECK (price_usd >= 0),
    duration_days INT NOT NULL CHECK (duration_days > 0),
    rating NUMERIC(2, 1) NOT NULL DEFAULT 4.8 CHECK (rating >= 1 AND rating <= 5),
    reviews_count INT NOT NULL DEFAULT 0 CHECK (reviews_count >= 0),
    image_url VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'cultural', -- europe, cultural, luxury, island, all
    description TEXT NOT NULL,
    highlights TEXT[],
    latitude NUMERIC(9, 6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude NUMERIC(9, 6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bookings Table (Traveler Reservations & Tickets)
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'BK-8421'
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    destination_id VARCHAR(50) REFERENCES destinations(id) ON DELETE SET NULL,
    destination_title VARCHAR(150) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    departure_date DATE NOT NULL,
    adults INT NOT NULL DEFAULT 1 CHECK (adults >= 1),
    children INT NOT NULL DEFAULT 0 CHECK (children >= 0),
    package_tier VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (package_tier IN ('standard', 'deluxe', 'luxury')),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    promo_code VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    special_requests TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Wishlists Table (Saved Trip Favorites per User)
CREATE TABLE IF NOT EXISTS wishlists (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    destination_id VARCHAR(50) NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, destination_id)
);

-- 5. Testimonials Table (Traveler Reviews)
CREATE TABLE IF NOT EXISTS testimonials (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    quote TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5) DEFAULT 5,
    avatar_url VARCHAR(255),
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Subscribers Table (Newsletter Signups)
CREATE TABLE IF NOT EXISTS subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    name VARCHAR(100),
    promo_code VARCHAR(50) DEFAULT 'EXPLORE15',
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning-fast queries (drop duplicate email index, add missing foreign key indexes)
DROP INDEX IF EXISTS idx_users_email;
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_destination_id ON bookings(destination_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_destination_id ON wishlists(destination_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_user_id ON testimonials(user_id);
CREATE INDEX IF NOT EXISTS idx_destinations_category ON destinations(category);

-- Ensure constraints and types on existing databases if initialized earlier
DO $$
BEGIN
    -- users constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
        ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('traveler', 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_points_check') THEN
        ALTER TABLE users ADD CONSTRAINT users_points_check CHECK (points >= 0);
    END IF;

    -- destinations constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'destinations_rating_check') THEN
        ALTER TABLE destinations ADD CONSTRAINT destinations_rating_check CHECK (rating >= 1 AND rating <= 5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'destinations_price_usd_check') THEN
        ALTER TABLE destinations ADD CONSTRAINT destinations_price_usd_check CHECK (price_usd >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'destinations_duration_days_check') THEN
        ALTER TABLE destinations ADD CONSTRAINT destinations_duration_days_check CHECK (duration_days > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'destinations_reviews_count_check') THEN
        ALTER TABLE destinations ADD CONSTRAINT destinations_reviews_count_check CHECK (reviews_count >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'destinations_latitude_check') THEN
        ALTER TABLE destinations ADD CONSTRAINT destinations_latitude_check CHECK (latitude BETWEEN -90 AND 90);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'destinations_longitude_check') THEN
        ALTER TABLE destinations ADD CONSTRAINT destinations_longitude_check CHECK (longitude BETWEEN -180 AND 180);
    END IF;

    -- bookings constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_adults_check') THEN
        ALTER TABLE bookings ADD CONSTRAINT bookings_adults_check CHECK (adults >= 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_children_check') THEN
        ALTER TABLE bookings ADD CONSTRAINT bookings_children_check CHECK (children >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_package_tier_check') THEN
        ALTER TABLE bookings ADD CONSTRAINT bookings_package_tier_check CHECK (package_tier IN ('standard', 'deluxe', 'luxury'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_status_check') THEN
        ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('confirmed', 'cancelled', 'completed'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_total_price_check') THEN
        ALTER TABLE bookings ADD CONSTRAINT bookings_total_price_check CHECK (total_price >= 0);
    END IF;
END $$;

-- Automatic updated_at trigger for users
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
