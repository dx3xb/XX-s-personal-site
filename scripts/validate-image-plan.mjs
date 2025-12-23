const [projectSnake, projectDeer] = process.argv.slice(2);

if (!projectSnake || !projectDeer) {
  console.log("Usage: node scripts/validate-image-plan.mjs <projectId1> <projectId2>");
  process.exit(1);
}

async function loadPlan(projectId) {
  const res = await fetch(
    `http://localhost:3000/api/debug/image-plan?project_id=${projectId}`
  );
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || "Failed to load image plan");
  }
  return data;
}

function assertNoCrossSubject(images, includeToken, excludeToken) {
  const bad = images.filter((img) => {
    const prompt = String(img.prompt || "");
    return prompt.includes(excludeToken);
  });
  if (bad.length) {
    throw new Error(
      `Found cross-subject prompts containing "${excludeToken}" in ${bad.length} items.`
    );
  }
  const good = images.some((img) => String(img.prompt || "").includes(includeToken));
  if (!good) {
    throw new Error(`No prompts contain expected subject "${includeToken}".`);
  }
}

const [planSnake, planDeer] = await Promise.all([
  loadPlan(projectSnake),
  loadPlan(projectDeer),
]);

assertNoCrossSubject(planSnake.images, "小蛇", "小鹿");
assertNoCrossSubject(planDeer.images, "小鹿", "小蛇");

console.log("OK: prompts are isolated per project_id");
