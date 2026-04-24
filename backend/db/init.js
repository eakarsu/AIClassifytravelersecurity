const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'operator',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS security_alerts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical','high','medium','low')),
        category VARCHAR(100),
        region VARCHAR(255),
        country VARCHAR(255),
        city VARCHAR(255),
        source VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active','monitoring','resolved','dismissed')),
        affected_travelers INT DEFAULT 0,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        ai_classification TEXT,
        ai_risk_score INT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS travelers (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        passport_number VARCHAR(50),
        nationality VARCHAR(100),
        emergency_contact_name VARCHAR(255),
        emergency_contact_phone VARCHAR(50),
        current_location VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active','traveling','alert','evacuated','safe')),
        risk_level VARCHAR(20) DEFAULT 'low',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS trips (
        id SERIAL PRIMARY KEY,
        traveler_id INT REFERENCES travelers(id) ON DELETE CASCADE,
        destination VARCHAR(255) NOT NULL,
        country VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'upcoming' CHECK (status IN ('upcoming','active','completed','cancelled')),
        hotel_name VARCHAR(255),
        hotel_address TEXT,
        flight_number VARCHAR(50),
        notes TEXT,
        risk_level VARCHAR(20) DEFAULT 'low',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS destinations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        country VARCHAR(255) NOT NULL,
        region VARCHAR(255),
        risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('critical','high','medium','low')),
        risk_score INT DEFAULT 0,
        description TEXT,
        travel_advisory TEXT,
        health_risks TEXT,
        entry_requirements TEXT,
        local_emergency_number VARCHAR(50),
        active_alerts INT DEFAULT 0,
        active_travelers INT DEFAULT 0,
        ai_risk_assessment TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS incident_reports (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        incident_type VARCHAR(100) NOT NULL,
        severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical','high','medium','low')),
        location VARCHAR(255),
        country VARCHAR(255),
        date_occurred TIMESTAMP NOT NULL,
        date_reported TIMESTAMP DEFAULT NOW(),
        reported_by VARCHAR(255),
        status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
        affected_travelers_count INT DEFAULT 0,
        response_actions TEXT,
        ai_analysis TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS emergency_contacts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        organization VARCHAR(255),
        role VARCHAR(100),
        country VARCHAR(255),
        region VARCHAR(255),
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        contact_type VARCHAR(100) CHECK (contact_type IN ('embassy','hospital','police','fire','local_guide','insurance','company','other')),
        available_24h BOOLEAN DEFAULT false,
        languages VARCHAR(255),
        notes TEXT,
        priority INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS travel_advisories (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        country VARCHAR(255) NOT NULL,
        region VARCHAR(255),
        advisory_level VARCHAR(50) NOT NULL CHECK (advisory_level IN ('do_not_travel','reconsider','exercise_caution','normal')),
        issued_by VARCHAR(255),
        issued_date DATE,
        expiry_date DATE,
        description TEXT,
        key_risks TEXT,
        recommendations TEXT,
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active','expired','updated','withdrawn')),
        ai_summary TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS risk_assessments (
        id SERIAL PRIMARY KEY,
        destination VARCHAR(255) NOT NULL,
        country VARCHAR(255) NOT NULL,
        assessment_date DATE DEFAULT CURRENT_DATE,
        overall_risk VARCHAR(20) NOT NULL CHECK (overall_risk IN ('critical','high','medium','low')),
        political_risk VARCHAR(20) DEFAULT 'low',
        terrorism_risk VARCHAR(20) DEFAULT 'low',
        crime_risk VARCHAR(20) DEFAULT 'low',
        health_risk VARCHAR(20) DEFAULT 'low',
        natural_disaster_risk VARCHAR(20) DEFAULT 'low',
        infrastructure_risk VARCHAR(20) DEFAULT 'low',
        risk_score INT DEFAULT 0,
        summary TEXT,
        recommendations TEXT,
        assessed_by VARCHAR(255),
        ai_assessment TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS threat_analyses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        threat_type VARCHAR(100) NOT NULL,
        region VARCHAR(255),
        country VARCHAR(255),
        threat_level VARCHAR(20) NOT NULL CHECK (threat_level IN ('critical','high','medium','low')),
        description TEXT,
        potential_impact TEXT,
        affected_areas TEXT,
        mitigation_strategies TEXT,
        intelligence_source VARCHAR(255),
        confidence_level VARCHAR(50) CHECK (confidence_level IN ('confirmed','high','moderate','low','unverified')),
        valid_from DATE,
        valid_until DATE,
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active','monitoring','expired','resolved')),
        ai_analysis TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS communication_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL CHECK (category IN ('evacuation','weather','security','health','general','check_in','emergency')),
        subject VARCHAR(500) NOT NULL,
        body TEXT NOT NULL,
        severity VARCHAR(20) DEFAULT 'medium',
        channels VARCHAR(255) DEFAULT 'email',
        language VARCHAR(50) DEFAULT 'English',
        placeholders TEXT,
        last_used TIMESTAMP,
        usage_count INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active','draft','archived')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS geofencing_zones (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        zone_type VARCHAR(50) NOT NULL CHECK (zone_type IN ('danger','restricted','safe','monitoring','evacuation')),
        country VARCHAR(255),
        region VARCHAR(255),
        center_lat DECIMAL(10,8),
        center_lng DECIMAL(11,8),
        radius_km DECIMAL(10,2),
        description TEXT,
        alert_message TEXT,
        severity VARCHAR(20) DEFAULT 'medium',
        active_travelers INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active','inactive','expired')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Database tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
