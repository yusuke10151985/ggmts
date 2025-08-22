import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { FileMetadata, isAllowedFileType, MAX_FILE_SIZE, getFileExtension, ALLOWED_FILE_TYPES } from '@/types/mom/file';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type - be more lenient
    // Check if either MIME type is allowed or file has a valid extension
    const fileExtension = getFileExtension(file.name);
    const isValidType = isAllowedFileType(file.type);
    const hasValidExtension = Object.values(ALLOWED_FILE_TYPES).some(exts => 
      (exts as readonly string[]).includes(fileExtension)
    );
    
    // Log unknown file types for monitoring but allow them
    if (!isValidType && !hasValidExtension) {
      console.warn(`Unknown file type uploaded: ${file.name} (${file.type})`);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` },
        { status: 400 }
      );
    }

    // Sanitize filename and add timestamp to prevent duplicates
    const timestamp = new Date().getTime();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${sanitizedName}`;
    
    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    // Prepare metadata
    const metadata: FileMetadata = {
      url: blob.url,
      pathname: blob.pathname,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: metadata,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upload file' 
      },
      { status: 500 }
    );
  }
}

// App Router doesn't support the config export
// Body size limit is handled by Next.js automatically