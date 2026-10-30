-- ============================================================================
-- JADOO TRAVEL INITIAL SEED DATA (POSTGRESQL)
-- ============================================================================

-- 1. Insert Default Demo User (Password: Traveler123!)
-- Hash generated using bcrypt with salt rounds 10
INSERT INTO users (name, email, password_hash, avatar_url, role, bio, home_city, points)
VALUES (
    'Sarah Jenkins',
    'sarah.jenkins@example.com',
    '$2b$10$t6SaKL7xbBarhGsgmfKfEejoyTXNt1D.JBGncuFfFRTrc8DqRxlDa',
    'assets/Images/testimonial-section/author-mike.jpg',
    'traveler',
    'Passionate explorer, architectural photographer and globetrotter.',
    'San Francisco, CA',
    1850
) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 2. Insert Standard Destinations
INSERT INTO destinations (id, title, country, price_usd, duration_days, rating, reviews_count, image_url, category, description, highlights, latitude, longitude, is_featured)
VALUES 
(
    'rome-italy',
    'Rome, Italy',
    'Italy',
    5420.00,
    10,
    4.9,
    128,
    'assets/Images/destination-section/dest-1-rome.jpg',
    'cultural',
    'Immerse yourself in the eternal city of Rome. Walk through the Colosseum, marvel at the Vatican Museums, toss a coin in Trevi Fountain, and savor handmade pasta in historic Trastevere.',
    ARRAY['Skip-the-line Colosseum tour', 'Private Vatican & Sistine Chapel pass', 'Trastevere authentic culinary walk', 'Historic 4-star boutique hotel accommodation'],
    41.9028,
    12.4964,
    TRUE
),
(
    'london-uk',
    'London, UK',
    'United Kingdom',
    4200.00,
    12,
    4.8,
    94,
    'assets/Images/destination-section/dest-2-london.jpg',
    'europe',
    'Experience the vibrant heritage of London. Stroll along the River Thames, visit the Tower of London, watch the Changing of the Guard, and explore world-class galleries in Covent Garden.',
    ARRAY['Tower Bridge & Westminster guided pass', 'Afternoon tea at The Ritz', 'West End theatre evening tickets', 'Central London luxury hotel stay'],
    51.5074,
    -0.1278,
    TRUE
),
(
    'full-europe',
    'Full Europe Grand Tour',
    'Multi-Country',
    15000.00,
    28,
    5.0,
    76,
    'assets/Images/destination-section/dest-3-europe.jpg',
    'europe',
    'The ultimate continental adventure spanning Paris, Swiss Alps, Venice, Vienna, and Amsterdam. First-class rail travel, curated landmark visits, and unforgettable cultural tapestry.',
    ARRAY['First-class Eurail unlimited passes', 'Swiss Alps panoramic scenic rail pass', 'Gondola cruise in Venice', 'Top-tier five-star hotel network'],
    48.8566,
    2.3522,
    TRUE
),
(
    'santorini-greece',
    'Santorini, Greece',
    'Greece',
    3800.00,
    7,
    4.9,
    112,
    'assets/Images/destination-section/dest-1-rome.jpg',
    'island',
    'Perched upon the caldera clifftops, Santorini offers breathtaking sunsets over Oia, whitewashed Cycladic architecture, blue-domed churches, and crystal-clear Aegean waters.',
    ARRAY['Private sunset catamaran cruise', 'Wine tasting tour of traditional vineyards', 'Cliffside caldera suite with private plunge pool', 'Helicopter transfer options'],
    36.3932,
    25.4615,
    FALSE
),
(
    'bali-indonesia',
    'Bali, Indonesia',
    'Indonesia',
    2900.00,
    14,
    4.7,
    88,
    'assets/Images/destination-section/dest-2-london.jpg',
    'luxury',
    'A tropical paradise of emerald rice terraces, sacred water temples, world-class surf breaks, and tranquil wellness retreats in Ubud and Seminyak.',
    ARRAY['Private pool villa in Ubud', 'Sunrise hike to Mount Batur', 'Traditional Balinese spa and yoga sessions', 'Private chauffeur and cultural guide'],
    -8.3405,
    115.0920,
    FALSE
),
(
    'tokyo-japan',
    'Tokyo, Japan',
    'Japan',
    6100.00,
    10,
    4.9,
    145,
    'assets/Images/destination-section/dest-3-europe.jpg',
    'cultural',
    'Where ancient tradition meets neon futurism. Wander through historic Asakusa temples, marvel at bustling Shibuya Crossing, and indulge in Michelin-starred gastronomy.',
    ARRAY['Private tour of Tsukiji fish market and sushi workshop', 'Shinkansen bullet train pass to Kyoto', 'Digital art museum admission', 'Luxury hotel with Mount Fuji panorama'],
    35.6762,
    139.6503,
    FALSE
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    price_usd = EXCLUDED.price_usd,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude;

-- 3. Insert Initial Testimonials
INSERT INTO testimonials (author_name, location, quote, rating, avatar_url, is_approved)
VALUES 
(
    'Mike Taylor',
    'Lahore, Pakistan',
    'On the Windows talking painted pasture yet its express parties use. Sure last upon he same as knew next. Of believed or diverted no.',
    5,
    'assets/Images/testimonial-section/author-mike.jpg',
    TRUE
),
(
    'Chris Thomas',
    'CEO of Red Button',
    'Jadoo curated our corporate leadership summit in Europe with surgical precision. Every transfer, villa, and private excursion was extraordinary.',
    5,
    'assets/Images/testimonial-section/author-mike.jpg',
    TRUE
),
(
    'Elena Rostova',
    'Milan, Italy',
    'The 10-day Rome & Amalfi itinerary exceeded all our dreams. Outstanding 24/7 VIP concierge support and unbeatable hotel perks!',
    5,
    'assets/Images/testimonial-section/author-mike.jpg',
    TRUE
);

-- 4. Initial Booking for Demo User
INSERT INTO bookings (id, user_id, destination_id, destination_title, full_name, email, phone, departure_date, adults, children, package_tier, total_price, promo_code, status, special_requests)
SELECT 
    'BK-8421',
    u.id,
    'santorini-greece',
    'Santorini, Greece',
    u.name,
    u.email,
    '+1 (555) 234-5678',
    CURRENT_DATE + INTERVAL '21 days',
    2,
    0,
    'deluxe',
    3230.00,
    'EXPLORE15',
    'confirmed',
    'Caldera view room preferred. Late check-in requested.'
FROM users u WHERE u.email = 'sarah.jenkins@example.com'
ON CONFLICT (id) DO NOTHING;
