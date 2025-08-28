import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabase } from '@/lib/supabase';
import prisma from '@/lib/prisma';

// GET: Fetch factory terms
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Try Supabase first
    if (supabase) {
      try {
        let query = supabase
          .from('terms')
          .select(`
            *,
            term_images(
              id,
              image_url,
              caption,
              order_index
            )
          `)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (category && category !== 'all') {
          query = query.eq('category', category);
        }

        if (search) {
          query = query.or(`japanese.ilike.%${search}%,english.ilike.%${search}%,thai.ilike.%${search}%,description.ilike.%${search}%`);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Supabase query error:', error);
          // Fall through to Prisma
        } else {
          return NextResponse.json({ 
            success: true, 
            data: data || [],
            source: 'supabase'
          });
        }
      } catch (supabaseError) {
        console.error('Supabase connection error:', supabaseError);
        // Fall through to Prisma
      }
    }

    // Fallback to Prisma
    const where: any = {};
    
    if (category && category !== 'all') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { japanese: { contains: search, mode: 'insensitive' } },
        { english: { contains: search, mode: 'insensitive' } },
        { thai: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const terms = await prisma.factoryTerm.findMany({
      where,
      include: {
        usageExamples: true
      },
      orderBy: {
        viewCount: 'desc'
      },
      take: limit,
      skip: offset
    });

    return NextResponse.json({ 
      success: true, 
      data: terms,
      source: 'prisma'
    });

  } catch (error) {
    console.error('Error fetching factory terms:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch terms' },
      { status: 500 }
    );
  }
}

// POST: Create new factory term (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      japanese,
      japaneseReading,
      english,
      thai,
      thaiReading,
      category,
      description,
      safetyNotes,
      tags
    } = body;

    // Try Supabase first
    if (supabase) {
      const { data, error } = await supabase
        .from('terms')
        .insert([{
          japanese,
          japanese_reading: japaneseReading,
          english,
          thai,
          thai_reading: thaiReading,
          category,
          description,
          safety_notes: safetyNotes,
          tags: tags || [],
          created_by: session.user?.email,
          view_count: 0
        }])
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ 
        success: true, 
        data,
        source: 'supabase'
      });
    }

    // Fallback to Prisma
    const term = await prisma.factoryTerm.create({
      data: {
        japanese,
        japaneseReading,
        english,
        thai,
        thaiReading,
        category,
        description,
        safetyNotes,
        tags: tags || [],
        createdBy: session.user?.email,
        viewCount: 0
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: term,
      source: 'prisma'
    });

  } catch (error) {
    console.error('Error creating factory term:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create term' },
      { status: 500 }
    );
  }
}

// PUT: Update factory term (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Term ID is required' },
        { status: 400 }
      );
    }

    // Try Supabase first
    if (supabase) {
      // Convert field names for Supabase
      const supabaseData: any = {};
      if (updateData.japanese) supabaseData.japanese = updateData.japanese;
      if (updateData.japaneseReading) supabaseData.japanese_reading = updateData.japaneseReading;
      if (updateData.english) supabaseData.english = updateData.english;
      if (updateData.thai) supabaseData.thai = updateData.thai;
      if (updateData.thaiReading) supabaseData.thai_reading = updateData.thaiReading;
      if (updateData.category) supabaseData.category = updateData.category;
      if (updateData.description) supabaseData.description = updateData.description;
      if (updateData.safetyNotes !== undefined) supabaseData.safety_notes = updateData.safetyNotes;
      if (updateData.tags) supabaseData.tags = updateData.tags;
      
      supabaseData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('terms')
        .update(supabaseData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ 
        success: true, 
        data,
        source: 'supabase'
      });
    }

    // Fallback to Prisma
    const term = await prisma.factoryTerm.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ 
      success: true, 
      data: term,
      source: 'prisma'
    });

  } catch (error) {
    console.error('Error updating factory term:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update term' },
      { status: 500 }
    );
  }
}

// DELETE: Delete factory term (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Term ID is required' },
        { status: 400 }
      );
    }

    // Try Supabase first
    if (supabase) {
      const { error } = await supabase
        .from('terms')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return NextResponse.json({ 
        success: true, 
        message: 'Term deleted successfully',
        source: 'supabase'
      });
    }

    // Fallback to Prisma
    await prisma.factoryTerm.delete({
      where: { id }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Term deleted successfully',
      source: 'prisma'
    });

  } catch (error) {
    console.error('Error deleting factory term:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete term' },
      { status: 500 }
    );
  }
}