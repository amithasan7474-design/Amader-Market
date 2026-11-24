/**
 * Compresses an image file via canvas and optionally uploads via ImgBB API if
 * siteSettings.imgbbApiKey is configured; otherwise returns a compact Data URL
 * compatible with Firebase RTDB and offline Image Cache.
 */
export async function fileToCompressedDataUrl(
  file: File,
  maxDim = 1080,
  quality = 0.82
): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

  // Skip canvas re-encoding for SVGs or tiny files (< 120 KB)
  if (file.type === 'image/svg+xml' || file.size < 120 * 1024) {
    return rawDataUrl;
  }

  return await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const out = canvas.toDataURL('image/jpeg', quality);
      resolve(out.length < rawDataUrl.length ? out : rawDataUrl);
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

export async function uploadImageFile(
  file: File,
  imgbbApiKey?: string
): Promise<{ url: string; via: 'imgbb' | 'compressed' }> {
  const compressed = await fileToCompressedDataUrl(file);
  const key = (imgbbApiKey || '').trim();

  if (key && navigator.onLine) {
    try {
      const base64Body = compressed.includes(',') ? compressed.split(',')[1] : compressed;
      const body = new FormData();
      body.append('image', base64Body);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        body,
      });
      if (res.ok) {
        const json = (await res.json()) as {
          success?: boolean;
          data?: { url?: string; display_url?: string };
        };
        const hostedUrl = json?.data?.url || json?.data?.display_url;
        if (json?.success && hostedUrl) {
          return { url: hostedUrl, via: 'imgbb' };
        }
      }
    } catch {
      // Fall back to compressed Data URL automatically
    }
  }

  return { url: compressed, via: 'compressed' };
}

export function normalizeExternalUrl(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '#';
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}
