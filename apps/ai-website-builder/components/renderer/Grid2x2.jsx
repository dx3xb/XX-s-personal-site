import React from "react";
import ImageFigure from "./ImageFigure";

function Grid2x2({ block, imageMap, onImageClick }) {
  const items = block.items || [];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="border border-black/10 rounded-xl p-4 space-y-3"
        >
          {block.images?.[idx] && (
            <ImageFigure
              image={block.images[idx]}
              imageMap={imageMap}
              onImageClick={onImageClick}
            />
          )}
          <p className="text-sm leading-6">{item}</p>
        </div>
      ))}
    </div>
  );
}

export default Grid2x2;
