import React from "react";
import ImageFigure from "./ImageFigure";

function ProseBlock({ block, imageMap, onImageClick }) {
  return (
    <div className="space-y-4">
      {(block.images || []).map((image) => (
        <ImageFigure
          key={image.id}
          image={image}
          imageMap={imageMap}
          onImageClick={onImageClick}
        />
      ))}
      {(block.paragraphs || []).map((text, idx) => (
        <p key={idx} className="leading-7 text-black">
          {text}
        </p>
      ))}
    </div>
  );
}

export default ProseBlock;
