import React from "react";
import StickyTOC from "./StickyTOC";
import Section from "./Section";

function SiteRenderer({ payload, imageMap, onImageClick }) {
  if (!payload) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="text-sm text-black/60">暂无可用内容</div>
      </div>
    );
  }
  const sections = payload.sections || [];
  return (
    <div className="min-h-screen bg-white text-black">
      <StickyTOC sections={sections} />
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        {sections.map((section) => (
          <Section
            key={section.id}
            section={section}
            imageMap={imageMap}
            onImageClick={onImageClick}
          />
        ))}
      </main>
    </div>
  );
}

export default SiteRenderer;
