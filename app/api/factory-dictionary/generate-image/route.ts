import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Admin only feature
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Image generation is restricted to Admin users only' 
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { termId, prompt, style = 'technical' } = body;

    if (!termId || !prompt) {
      return NextResponse.json(
        { success: false, error: 'Term ID and prompt are required' },
        { status: 400 }
      );
    }

    // Here you would integrate with an image generation API
    // For example: DALL-E, Stable Diffusion, etc.
    // This is a placeholder implementation
    
    // Generate image using OpenAI DALL-E (example)
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiKey) {
      return NextResponse.json(
        { success: false, error: 'Image generation service not configured' },
        { status: 503 }
      );
    }

    // Call DALL-E API
    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: `Technical illustration for factory/industrial use: ${prompt}. Style: ${style}, clean, professional, safety-focused.`,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      })
    });

    if (!imageResponse.ok) {
      const error = await imageResponse.json();
      throw new Error(error.error?.message || 'Failed to generate image');
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.data[0].url;

    // Store the image URL in Supabase storage (optional)
    // You could download and store the image in Supabase Storage here

    // Update the term with the new image URL
    if (supabase) {
      const { error } = await supabase
        .from('factory_terms')
        .update({ 
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', termId);

      if (error) throw error;
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        imageUrl,
        termId,
        generatedBy: session.user?.email,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to generate image' 
      },
      { status: 500 }
    );
  }
}