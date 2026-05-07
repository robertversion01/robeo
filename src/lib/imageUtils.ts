/**
 * Utility functions for image handling and optimization
 */

/**
 * Formats an image URL for optimal loading
 * 
 * @param url The original image URL
 * @param width The desired width
 * @param quality The desired quality (1-100)
 * @returns The optimized image URL
 */
export function getOptimizedImageUrl(url: string | null, width: number = 400, quality: number = 80): string {
  if (!url) return '';
  
  // If it's already a Supabase storage URL, add transformation parameters
  if (url.includes('supabase.co/storage/v1/object/public')) {
    // Add width and quality parameters for Supabase storage image optimization
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${width}&quality=${quality}`;
  }
  
  // If it's an external URL, return as is
  return url;
}

/**
 * Generates a placeholder image URL
 * 
 * @param text Text to display on the placeholder
 * @param width Width of the placeholder
 * @param height Height of the placeholder
 * @returns Placeholder image URL
 */
export function getPlaceholderImage(text: string = 'No Image', width: number = 400, height: number = 500): string {
  // Use a placeholder service
  return `https://placehold.co/${width}x${height}/e0e0e0/a0a0a0?text=${encodeURIComponent(text)}`;
}

/**
 * Formats an array of image URLs for a product
 * 
 * @param product The product object
 * @returns An array of image URLs
 */
export function getProductImages(product: { image_url: string | null, images: string[] }): string[] {
  const images: string[] = [];
  
  // Add the main image if it exists
  if (product.image_url) {
    images.push(getOptimizedImageUrl(product.image_url));
  }
  
  // Add additional images if they exist
  if (product.images && Array.isArray(product.images)) {
    product.images.forEach(img => {
      if (img && !images.includes(img)) {
        images.push(getOptimizedImageUrl(img));
      }
    });
  }
  
  // If no images, add a placeholder
  if (images.length === 0) {
    images.push(getPlaceholderImage());
  }
  
  return images;
}

/**
 * Determines if an image should be lazy loaded
 * 
 * @param index The index of the image in a list
 * @returns Whether the image should be lazy loaded
 */
export function shouldLazyLoad(index: number): boolean {
  // Only eagerly load the first few images
  return index >= 2;
}