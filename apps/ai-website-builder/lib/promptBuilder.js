const PRESETS = {
  kids_story_illustration: {
    style:
      "儿童绘本插画风格，粉彩色调，线条干净，表情友好，画面简洁",
    modifiers: ["柔和", "温暖", "亲子友好"],
    camera: "中景为主，主体居中，留白充足",
    lighting: "柔和漫射光，暖色调，高光柔和",
  },
  product_promo: {
    style: "产品海报风格，棚拍质感，简洁背景，强调材质与轮廓",
    modifiers: ["精致", "现代", "清晰"],
    camera: "近景或中景，主体居中，背景干净",
    lighting: "柔光箱灯光，微对比，高光清晰",
  },
  cinematic_scene: {
    style: "电影感叙事画面，写实质感，画面层次丰富",
    modifiers: ["氛围感", "情绪化", "沉浸感"],
    camera: "广角或中景，三分构图，视角明确",
    lighting: "体积光或侧光，冷暖对比，层次清晰",
  },
  ui_diagram_or_tech: {
    style: "科技科普插画风格，结构清晰，元素有序",
    modifiers: ["理性", "高可读性", "结构化"],
    camera: "俯视或正视，构图对称，信息层级明确",
    lighting: "冷色主光，局部强调光，干净对比",
  },
};

const KEYWORDS = {
  kids: ["宝宝", "儿童", "绘本", "睡前", "2岁", "幼儿", "亲子", "童话"],
  product: ["产品", "电商", "海报", "促销", "品牌", "发布会", "新品"],
  cinematic: ["电影", "剧情", "史诗", "镜头", "大片", "叙事"],
  tech: ["科技", "科普", "实验室", "算法", "工程", "硬件", "AI", "技术"],
};

function includesAny(text, list) {
  return list.some((word) => text.includes(word));
}

function detectPreset(text) {
  if (includesAny(text, KEYWORDS.kids)) return "kids_story_illustration";
  if (includesAny(text, KEYWORDS.product)) return "product_promo";
  if (includesAny(text, KEYWORDS.tech)) return "ui_diagram_or_tech";
  if (includesAny(text, KEYWORDS.cinematic)) return "cinematic_scene";
  return "cinematic_scene";
}

function detectSubject(text) {
  if (text.includes("博美") || text.includes("小狗") || text.includes("狗")) {
    return "一只毛发蓬松的博美小狗";
  }
  if (text.includes("猫")) return "一只柔软的小猫";
  if (text.includes("产品")) return "一款核心产品";
  if (text.includes("实验室")) return "一间科技实验室中的核心设备";
  if (text.includes("机器人")) return "一台智能机器人";
  return "画面主角";
}

function detectName(text) {
  const match = text.match(/叫([^，。\\s]{1,10})/);
  return match ? match[1] : null;
}

function sceneByIndex(index, total) {
  if (total <= 1) return "主视觉场景";
  if (index === 0) return "故事开端";
  if (index === total - 1) return "故事收束";
  return "故事发展";
}

function enrichAction(text, index, total) {
  if (includesAny(text, KEYWORDS.kids)) {
    if (index === 0) return "轻轻探索、好奇张望";
    if (index === total - 1) return "安心微笑、温柔依偎";
    return "开心互动、追逐玩具";
  }
  if (includesAny(text, KEYWORDS.product)) return "展示核心功能与质感";
  if (includesAny(text, KEYWORDS.tech)) return "展示系统结构与关键模块";
  return "与环境产生互动";
}

function enrichDetails(text) {
  const details = [];
  if (text.includes("阳光") || text.includes("明媚")) {
    details.push("柔和散射阳光、温暖色调");
  }
  if (text.includes("温馨") || text.includes("暖")) {
    details.push("温暖质感、舒适氛围、干净细节");
  }
  if (text.includes("小狗") || text.includes("博美") || text.includes("狗")) {
    details.push("毛发细节清晰、眼神灵动、表情友好");
  }
  if (text.includes("房间") || text.includes("室内")) {
    details.push("室内柔软织物、简洁家具、整洁环境");
  }
  if (details.length === 0) {
    details.push("细节清晰、材质真实、画面干净");
  }
  return details.join("；");
}

function buildPromptSegments({ userInput, basePrompt, index, total, presetName }) {
  const preset = PRESETS[presetName];
  const name = detectName(userInput);
  const subject = detectSubject(userInput);
  const sceneTag = sceneByIndex(index, total);
  const action = enrichAction(userInput, index, total);

  const A = `主体：${name ? `名叫${name}的` : ""}${subject}，动作与情绪：${action}`;
  const B = `场景与叙事：${sceneTag}，地点氛围贴合需求，加入温暖的故事道具与环境细节`;
  const C = `风格锚点：${preset.style}，一致性修饰：${preset.modifiers.join("、")}`;
  const D = `构图与镜头：${preset.camera}，主体清晰，画面层次明确`;
  const E = `光线与色彩：${preset.lighting}，对比度适中`;
  const F = `细节与材质：${enrichDetails(userInput)}，保持干净无杂乱`;
  const G = "质量与渲染：高细节、4k、清晰对焦、干净边缘、无文字无水印";

  const prompt = [A, B, C, D, E, F, G].join("；");

  return { prompt, segments: { A, B, C, D, E, F, G } };
}

export function buildImagePrompts({
  userInput,
  imagePrompts,
  debug = false,
}) {
  const safeInput = userInput || "";
  const presetName = detectPreset(safeInput);
  const total = imagePrompts.length;
  const nextPrompts = [];
  const debugOutput = [];

  imagePrompts.forEach((item, index) => {
    const basePrompt = item?.prompt || "";
    const { prompt, segments } = buildPromptSegments({
      userInput: safeInput,
      basePrompt,
      index,
      total,
      presetName,
    });
    nextPrompts.push({
      ...item,
      prompt,
      preset: presetName,
    });
    if (debug) {
      debugOutput.push({
        id: item.id,
        preset: presetName,
        segments,
      });
    }
  });

  return { prompts: nextPrompts, debug: debugOutput };
}

export function mapScenePlanToPrompts(scenePlan, basePrompts) {
  const fallback = Array.isArray(basePrompts) ? basePrompts : [];
  if (!Array.isArray(scenePlan) || scenePlan.length === 0) {
    return fallback;
  }
  return scenePlan.map((scene, index) => {
    const base = fallback[index] || fallback[0] || {};
    return {
      ...base,
      id: scene.scene_id || base.id || `scene-${index + 1}`,
      prompt: base.prompt || "",
      size: base.size,
    };
  });
}
