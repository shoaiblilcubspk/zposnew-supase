/**
 * ProductThumb
 * Shared product image renderer. Resolves content-addressed hashes (or legacy
 * base64/URL values) to a renderable URL via useProductImage, and shows a
 * fallback node when no image is available. Use everywhere a product image is
 * displayed so the resolve/image-load logic lives in exactly one place.
 */

import { ReactNode } from 'react';
import { useProductImage } from '../../hooks/useProductImage';

interface ProductThumbProps {
  image: string | undefined | null;
  alt?: string;
  imgClassName?: string;
  fallback?: ReactNode;
  loading?: 'lazy' | 'eager';
}

export function ProductThumb({
  image,
  alt = '',
  imgClassName = 'w-full h-full object-cover',
  fallback = null,
  loading = 'lazy',
}: ProductThumbProps) {
  const url = useProductImage(image);
  if (!url) return <>{fallback}</>;
  return <img src={url} alt={alt} className={imgClassName} loading={loading} />;
}
