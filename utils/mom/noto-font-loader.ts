// **UNICODE FONT LOADER**: Loads Noto Sans fonts for proper Unicode support
// Noto Sans supports Japanese, Thai, and many other languages

export async function loadNotoSansFont(): Promise<ArrayBuffer> {
  // **CRITICAL**: We'll use Google Fonts API to get Noto Sans CJK (Chinese, Japanese, Korean)
  // This font supports Japanese characters and has good coverage
  // For production, you should host this font file yourself
  
  try {
    // Try to load Noto Sans JP from Google Fonts CDN
    const response = await fetch(
      'https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEi75vY0rw-oME.ttf'
    );
    
    if (!response.ok) {
      throw new Error('Failed to load font');
    }
    
    return await response.arrayBuffer();
  } catch (error) {
    console.error('Failed to load Noto Sans font:', error);
    // Return null to fallback to standard fonts
    return null as any;
  }
}

export async function loadNotoSansThaiFont(): Promise<ArrayBuffer> {
  // Load Noto Sans Thai for Thai text support
  try {
    const response = await fetch(
      'https://fonts.gstatic.com/s/notosansthai/v25/iJWnBXeUZi_OHPqn4wq6hQ2_hbJ1xyN9wd43SofNWcd1MKVQt_So_9CdU5RspzF-QRvzzXg.ttf'
    );
    
    if (!response.ok) {
      throw new Error('Failed to load Thai font');
    }
    
    return await response.arrayBuffer();
  } catch (error) {
    console.error('Failed to load Noto Sans Thai font:', error);
    return null as any;
  }
}