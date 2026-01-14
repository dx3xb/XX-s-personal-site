import React from "react";
import ImageFigure from "./ImageFigure";

function VideoStack({ block, imageMap, onImageClick }) {
  const video = block.video || {};
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {(block.paragraphs || []).map((text, idx) => (
          <p key={idx} className="leading-7">
            {text}
          </p>
        ))}
      </div>
      <div className="border border-black/10 rounded-xl p-4 bg-black/5">
        <div className="text-sm text-black/60">视频占位</div>
        <div className="text-sm">{video.query_or_url || "待配置"}</div>
      </div>
      {(block.images || []).map((image) => (
        <ImageFigure
          key={image.id}
          image={image}
          imageMap={imageMap}
          onImageClick={onImageClick}
        />
      ))}
    </div>
  );
}

export default VideoStack;
