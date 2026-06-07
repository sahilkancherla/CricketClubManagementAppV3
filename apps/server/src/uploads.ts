// Allowed image upload types, mapping verified MIME type → file extension.
// Used by the avatar and club-logo endpoints to reject non-image uploads and to
// name the stored object from the trusted MIME rather than the client filename.
export const IMAGE_MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
