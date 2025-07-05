-- Add generate_api_model setting
INSERT INTO "Settings" (key, value, description) VALUES ('generate_api_model', 'gemini-1.5-flash', 'SNS生成で使用するAPIモデル') ON CONFLICT (key) DO NOTHING;