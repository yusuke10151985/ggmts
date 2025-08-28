-- Factory Dictionary Schema for Supabase
-- Run this in your Supabase SQL editor

-- Create enum for categories
CREATE TYPE factory_category AS ENUM (
  'Safety',
  'Machinery',
  'Quality',
  'Tools',
  'Materials',
  'General'
);

-- Create factory_terms table
CREATE TABLE IF NOT EXISTS factory_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  japanese VARCHAR(255) NOT NULL,
  japanese_reading VARCHAR(255) NOT NULL,
  english VARCHAR(255) NOT NULL,
  thai VARCHAR(255) NOT NULL,
  thai_reading VARCHAR(255) NOT NULL,
  category factory_category NOT NULL DEFAULT 'General',
  description TEXT NOT NULL,
  safety_notes TEXT,
  image_url TEXT,
  japanese_audio_url TEXT,
  english_audio_url TEXT,
  thai_audio_url TEXT,
  tags TEXT[] DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255)
);

-- Create usage_examples table
CREATE TABLE IF NOT EXISTS usage_examples (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  term_id UUID NOT NULL REFERENCES factory_terms(id) ON DELETE CASCADE,
  japanese TEXT NOT NULL,
  english TEXT NOT NULL,
  thai TEXT NOT NULL,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_factory_terms_category ON factory_terms(category);
CREATE INDEX idx_factory_terms_view_count ON factory_terms(view_count DESC);
CREATE INDEX idx_factory_terms_created_at ON factory_terms(created_at DESC);
CREATE INDEX idx_usage_examples_term_id ON usage_examples(term_id);

-- Enable Row Level Security
ALTER TABLE factory_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_examples ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public can view factory terms" ON factory_terms
  FOR SELECT USING (true);

CREATE POLICY "Public can view usage examples" ON usage_examples
  FOR SELECT USING (true);

-- Create policies for authenticated users to insert/update/delete
CREATE POLICY "Authenticated users can insert factory terms" ON factory_terms
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update factory terms" ON factory_terms
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete factory terms" ON factory_terms
  FOR DELETE USING (auth.role() = 'authenticated');

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_factory_terms_updated_at BEFORE UPDATE ON factory_terms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO factory_terms (
  japanese, japanese_reading, english, thai, thai_reading,
  category, description, safety_notes, tags, view_count
) VALUES
  ('安全帯', 'あんぜんたい', 'Safety Harness', 'สายรัดนิรภัย', 'saai-rat-niraphai',
   'Safety', 'Fall protection equipment worn by workers at height',
   'Must be inspected before each use. Replace if damaged.',
   ARRAY['safety', 'ppe', 'fall-protection'], 150),
   
  ('旋盤', 'せんばん', 'Lathe', 'เครื่องกลึง', 'khrueang-klueng',
   'Machinery', 'Machine tool for shaping metal by rotation',
   'Keep hands clear of moving parts. Use appropriate PPE.',
   ARRAY['machinery', 'metalworking', 'tools'], 120),
   
  ('品質管理', 'ひんしつかんり', 'Quality Control', 'การควบคุมคุณภาพ', 'kaan-khuaap-khum-khunnaphaap',
   'Quality', 'Process of ensuring products meet specifications',
   NULL,
   ARRAY['quality', 'inspection', 'management'], 200);

-- Create function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(term_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE factory_terms 
  SET view_count = view_count + 1,
      last_accessed_at = NOW()
  WHERE id = term_id;
END;
$$ LANGUAGE plpgsql;