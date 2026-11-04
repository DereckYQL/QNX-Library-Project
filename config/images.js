const sharp = require('sharp');
sharp.cache({ memory: 16, files: 0, items: 32 });
sharp.concurrency(2);
const limits = { failOn: 'warning', limitInputPixels: 16000000, sequentialRead: true };
async function normalizeCover(bytes) {
  try {
    const metadata = await sharp(bytes, limits).metadata();
    if (!['jpeg', 'png', 'webp', 'gif'].includes(metadata.format) ||
        !metadata.width || !metadata.height || metadata.width > 12000 ||
        metadata.height > 12000 || (metadata.pages || 1) > 1) throw new Error('unsupported image');
    // Decode pixels and produce a fresh raster, removing metadata and trailing data.
    return await sharp(bytes, limits).rotate()
      .resize({ width: 1600, height: 2400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 }).toBuffer();
  } catch {
    const error = new Error('Imagen invalida: usa PNG, JPEG, WebP o GIF no animado, hasta 16 megapixeles');
    error.status = 400; throw error;
  }
}
module.exports = { normalizeCover };
