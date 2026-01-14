import React from "react";
import ImageFigure from "./ImageFigure";

function BookGrid({ block, imageMap, onImageClick }) {
  const books = block.books || [];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {books.map((book, idx) => (
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
          <div className="text-sm font-semibold">{book.title}</div>
          <div className="text-xs text-black/60">{book.author}</div>
          <p className="text-sm leading-6">{book.blurb}</p>
        </div>
      ))}
    </div>
  );
}

export default BookGrid;
