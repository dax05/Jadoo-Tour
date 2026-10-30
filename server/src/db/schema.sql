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
    role VARCHAR(20) DEFAULT 'traveler',
    bio TEXT,
    phone VARCHAR(50),
    home_city VARCHAR(100),
    passport_number VARCHAR(100),
    travel_style VARCHAR(50) DEFAULT 'adventure', -- adventure, luxury, cultural, relaxing
    seat_preference VARCHAR(50) DEFAULT 'window', -- window, aisle
    dietary_requirements VARCHAR(100) DEFAULT 'standard',
    points INT DEFAULT 1250,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Destinations Table (World Trips, Coordinates & Pricing)
CREATE TABLE IF NOT EXISTS destinations (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'rome-italy', 'london-uk'
    title VARCHAR(150) NOT NULL,
    country VARCHAR(100) NOT NULL,
    price_usd NUMERIC(10, 2) NOT NULL,
    duration_days INT NOT NULL,
    rating NUMERIC(2, 1) DEFAULT 4.8,
    reviews_count INT DEFAULT 0,
    image_url VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'cultural', -- europe, cultural, luxury, island, all
    description TEXT NOT NULL,
    highlights TEXT[],
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bookings Table (Traveler Reservations & Tickets)
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'BK-8421'
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    destination_id VARCHAR(50) REFERENCES destinations(id) ON DELETE SET NULL,
    destination_title VARCHAR(150) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    departure_date DATE NOT NULL,
    adults INT NOT NULL DEFAULT 1,
    children INT NOT NULL DEFAULT 0,
    package_tier VARCHAR(20) NOT NULL DEFAULT 'standard', -- standard, deluxe, luxury
    total_price NUMERIC(10, 2) NOT NULL,
    promo_code VARCHAR(50),
    status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, cancelled, completed
    special_requests TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Wishlists Table (Saved Trip Favorites per User)
CREATE TABLE IF NOT EXISTS wishlists (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    destination_id VARCHAR(50) REFERENCES destinations(id) ON DELETE CASCADE,
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
    rating INT CHECK (rating >= 1 AND rating <= 5) DEFAULT 5,
    avatar_url VARCHAR(255),
    is_approved BOOLEAN DEFAULT TRUE,
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

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_destinations_category ON destinations(category);
