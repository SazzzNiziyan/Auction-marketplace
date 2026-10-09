import ImageKit from 'imagekit';
import { env } from '../config/env';

export const imagekit = new ImageKit({
  publicKey: env.IMAGEKIT_PUBLIC_KEY || 'default_public_key',
  privateKey: env.IMAGEKIT_PRIVATE_KEY || 'default_private_key',
  urlEndpoint: env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/auctio',
});

/**
 * Generate a signed upload auth token for the client.
 */
export function getUploadAuth() {
  try {
    return imagekit.getAuthenticationParameters();
  } catch {
    const timestamp = Math.floor(Date.now() / 1000);
    return {
      token: `mock_token_${timestamp}`,
      expire: timestamp + 1800,
      signature: `mock_sig_${timestamp}`,
    };
  }
}

/**
 * Delete a file from ImageKit by fileId.
 */
export async function deleteFile(fileId: string) {
  try {
    await imagekit.deleteFile(fileId);
    return { success: true };
  } catch (err) {
    console.warn('[ImageKit] Delete failed or mock:', err);
    return { success: false };
  }
}

/**
 * Get image URL with optional transformations.
 */
export function getTransformedUrl(
  path: string,
  transformations?: { width?: number; height?: number; quality?: number }
) {
  try {
    return imagekit.url({
      path,
      transformation: [
        {
          width: transformations?.width?.toString(),
          height: transformations?.height?.toString(),
          quality: transformations?.quality?.toString() ?? '80',
          format: 'webp',
        },
      ],
    });
  } catch {
    return path;
  }
}
