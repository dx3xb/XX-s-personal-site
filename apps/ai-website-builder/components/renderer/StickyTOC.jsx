import React, { useEffect, useState } from "react";

function StickyTOC({ sections }) {
  const [activeId, setActiveId] = useState(sections?.[0]?.id);

  useEffect(() => {
    if (!sections?.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px" }
    );
    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-black/10">
      <div className="max-w-5xl mx-auto px-6 py-3 flex gap-3 overflow-x-auto">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={`text-sm whitespace-nowrap px-3 py-1 rounded-full border ${
              activeId === section.id
                ? "border-red-500 text-red-600"
                : "border-black/10 text-black/60"
            }`}
          >
            {section.title}
          </a>
        ))}
      </div>
    </nav>
  );
}

export default StickyTOC;
