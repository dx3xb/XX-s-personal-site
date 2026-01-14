import React from "react";

function resolveImageSrc(image, imageMap) {
  if (!image) return "";
  return imageMap?.[image.id] || image.src;
}

function ImageFigure({ image, imageMap, onImageClick }) {
  if (!image) return null;
  return (
    <figure className="space-y-2">
      <img
        src={resolveImageSrc(image, imageMap)}
        alt={image.prompt}
        className="w-full rounded-xl border border-black/10 object-cover"
        onClick={() => onImageClick?.(image.id)}
        role={onImageClick ? "button" : undefined}
      />
      <figcaption className="text-xs text-black/50">{image.prompt}</figcaption>
    </figure>
  );
}

export default ImageFigure;
