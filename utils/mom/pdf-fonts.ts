// PDF Fonts configuration for pdfmake
// This file handles font loading for both client and server environments

export async function setupPdfMakeFonts(pdfMake: any): Promise<void> {
  // Skip if fonts are already loaded
  if (pdfMake.vfs) {
    return;
  }

  // Only load fonts in browser environment
  if (typeof window === 'undefined') {
    // Server-side: pdfmake will use default fonts
    return;
  }

  try {
    // Use dynamic import with webpack magic comment to ensure proper bundling
    const vfsFonts = await import(
      /* webpackChunkName: "pdfmake-fonts" */
      'pdfmake/build/vfs_fonts'
    );
    
    // Handle different module formats
    const fontsModule: any = vfsFonts.default || vfsFonts;
    
    // Try different ways to access the vfs object
    let vfs = null;
    
    if (fontsModule.pdfMake && fontsModule.pdfMake.vfs) {
      vfs = fontsModule.pdfMake.vfs;
    } else if (fontsModule.vfs) {
      vfs = fontsModule.vfs;
    } else if (typeof fontsModule === 'object') {
      // Sometimes the module itself is the vfs object
      vfs = fontsModule;
    }
    
    if (vfs) {
      pdfMake.vfs = vfs;
    }
  } catch (error) {
    console.warn('Could not load PDF fonts:', error);
    // Continue without custom fonts - pdfmake will use defaults
  }
}