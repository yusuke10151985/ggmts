const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSampleImage() {
  const termId = 'd244ebde-2bf9-4556-8caa-cb51b9044cc9';
  
  // Add sample image URLs to the term
  const { data, error } = await supabase
    .from('terms')
    .update({ 
      image_urls: ['https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400&q=80'] 
    })
    .eq('id', termId);

  if (error) {
    console.error('Error updating term:', error);
  } else {
    console.log('Successfully added sample image to term');
    
    // Also add to term_images table
    const { data: imageData, error: imageError } = await supabase
      .from('term_images')
      .insert({
        term_id: termId,
        image_url: 'https://images.unsplash.com/photo-1567945716310-4745a6b7844b?w=400&q=80',
        caption: 'Factory equipment',
        order_index: 0
      });
      
    if (imageError) {
      console.error('Error adding to term_images:', imageError);
    } else {
      console.log('Successfully added image to term_images table');
    }
  }
}

addSampleImage();