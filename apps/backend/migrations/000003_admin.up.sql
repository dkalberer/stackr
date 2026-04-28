SET search_path = stackr;

INSERT INTO users (email, password_hash, name)
VALUES ('admin@stackr.local', '$2a$10$QGaym7LppQ6bfdgu34ugXePJh5W2A1Pv4WfedfhVVIcF7eAobUlAG', 'Admin')
ON CONFLICT (email) DO NOTHING;
