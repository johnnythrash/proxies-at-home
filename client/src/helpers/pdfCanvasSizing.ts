export interface CanvasPlacement {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  upscale: boolean;
}

/**
 * Select the centered source rectangle used to normalize a processed card image
 * to the PDF layout's exact pixel dimensions.
 *
 * Larger canvases are cropped at 1:1 so excess bleed is removed. Smaller
 * canvases are aspect-preservingly enlarged to fill the target instead of
 * being centered at native resolution with empty space around them.
 */
export function getCanvasPlacement(
  actualWidth: number,
  actualHeight: number,
  expectedWidth: number,
  expectedHeight: number
): CanvasPlacement {
  if (actualWidth <= 0 || actualHeight <= 0 || expectedWidth <= 0 || expectedHeight <= 0) {
    throw new Error("Canvas dimensions must be positive");
  }

  const needsUpscale = actualWidth < expectedWidth || actualHeight < expectedHeight;
  if (!needsUpscale) {
    return {
      sourceX: (actualWidth - expectedWidth) / 2,
      sourceY: (actualHeight - expectedHeight) / 2,
      sourceWidth: expectedWidth,
      sourceHeight: expectedHeight,
      upscale: false,
    };
  }

  const sourceAspect = actualWidth / actualHeight;
  const targetAspect = expectedWidth / expectedHeight;
  let sourceWidth = actualWidth;
  let sourceHeight = actualHeight;

  // Use a centered "cover" crop so scaling remains uniform even when source
  // and target aspect ratios differ slightly because of bleed or rounding.
  if (sourceAspect > targetAspect) {
    sourceWidth = actualHeight * targetAspect;
  } else if (sourceAspect < targetAspect) {
    sourceHeight = actualWidth / targetAspect;
  }

  return {
    sourceX: (actualWidth - sourceWidth) / 2,
    sourceY: (actualHeight - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    upscale: true,
  };
}