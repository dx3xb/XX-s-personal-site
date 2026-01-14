import React from "react";
import BlockRenderer from "./BlockRenderer";

function Section({ section, imageMap, onImageClick }) {
  return (
    <section id={section.id} className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{section.title}</h2>
      </div>
      <div className="space-y-6">
        {section.blocks.map((block) => (
          <BlockRenderer
            key={block.block_id}
            block={block}
            imageMap={imageMap}
            onImageClick={onImageClick}
          />
        ))}
      </div>
    </section>
  );
}

export default Section;
