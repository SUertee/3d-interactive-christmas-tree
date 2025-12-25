const loadImageElement = (file: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });

const loadImageSource = async (
  file: Blob
): Promise<ImageBitmap | HTMLImageElement> => {
  try {
    return await createImageBitmap(file);
  } catch {
    return loadImageElement(file);
  }
};

export const compressImageFile = async (
  file: File,
  maxSize = 2048,
  quality = 0.9
): Promise<Blob> => {
  const source = await loadImageSource(file);
  const width = "width" in source ? source.width : (source as ImageBitmap).width;
  const height =
    "height" in source ? source.height : (source as ImageBitmap).height;
  const scale = Math.min(1, maxSize / Math.max(width, height));

  if (scale === 1) {
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return file;
  }

  ctx.drawImage(source as CanvasImageSource, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );

  return blob ?? file;
};
