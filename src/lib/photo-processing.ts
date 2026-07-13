import { Jimp } from "jimp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";

// Fetches a freshly-uploaded original from R2, resizes it, and generates a thumbnail.
export async function processAndStoreImage({
  r2Key,
  r2Url,
  thumbKey,
  width,
  height,
}: {
  r2Key: string;
  r2Url: string;
  thumbKey: string;
  width: number;
  height: number;
}) {
  let r2ThumbUrl: string | null = null;
  let resolvedThumbKey: string | null = null;
  let processedWidth = width;
  let processedHeight = height;

  try {
    const imageRes = await fetch(r2Url);
    if (!imageRes.ok) throw new Error(`R2 fetch returned ${imageRes.status}`);
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    // Resize full image to max 2560px on longest edge, re-encode as JPEG q92
    const fullImg = await Jimp.fromBuffer(imageBuffer);
    if (fullImg.width > 2560 || fullImg.height > 2560) {
      fullImg.scaleToFit({ w: 2560, h: 2560 });
    }
    const fullBuffer = await fullImg.getBuffer("image/jpeg", { quality: 92 });

    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: fullBuffer,
      ContentType: "image/jpeg",
    }));

    processedWidth = fullImg.width;
    processedHeight = fullImg.height;

    // Thumbnail — max 800px wide, JPEG q80
    const thumbImg = await Jimp.fromBuffer(fullBuffer);
    if (thumbImg.width > 800) {
      thumbImg.scaleToFit({ w: 800, h: 99999 });
    }
    const thumbBuffer = await thumbImg.getBuffer("image/jpeg", { quality: 80 });

    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: thumbKey,
      Body: thumbBuffer,
      ContentType: "image/jpeg",
    }));

    r2ThumbUrl = `${R2_PUBLIC_URL}/${thumbKey}`;
    resolvedThumbKey = thumbKey;
  } catch (err) {
    console.error("[photo-processing] image processing failed:", err);
  }

  return { r2ThumbUrl, resolvedThumbKey, processedWidth, processedHeight };
}
