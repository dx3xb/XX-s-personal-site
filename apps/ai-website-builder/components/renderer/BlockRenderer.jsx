import React from "react";
import ProseBlock from "./ProseBlock";
import Grid2x2 from "./Grid2x2";
import VideoStack from "./VideoStack";
import BookGrid from "./BookGrid";
import ImageFigure from "./ImageFigure";

const componentMap = {
  ProseBlock,
  Grid2x2,
  VideoStack,
  BookGrid,
  ImageFigure,
};

function BlockRenderer({ block, imageMap, onImageClick }) {
  const Component = componentMap[block.component] || ProseBlock;
  return <Component block={block} imageMap={imageMap} onImageClick={onImageClick} />;
}

export default BlockRenderer;
