import { GoogleGenerativeAI } from "@google/generative-ai";

const readJsonBody = async (req) => {
  if (req.body) return req.body;
  const raw = await new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  if (!process.env.GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY is missing.");
    return res.status(500).json({ error: "Missing API Key" });
  }

  const body = await readJsonBody(req);
  if (body === null) return res.status(400).json({ error: "Invalid JSON body" });
  const { type, contentHtml, contextHtml, contextText } = body || {};
  if (!type || !contentHtml) {
    return res.status(400).json({ error: "Missing content" });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-pro-preview",
      generationConfig: { responseMimeType: "application/json" },
      systemInstruction: `你是资深前端设计师，负责为“插入组件”生成高质量、与页面风格一致的 HTML 片段。

输出要求：
- 只返回 JSON：{ "html": "string" }
- HTML 必须是单一根元素
- 根元素必须包含 data-insert-block="true"
- 必须包含删除按钮：<button data-insert-remove="true">删除</button>
- 不允许使用 <script> 或 <style>
- 不允许输出 <html> <head> <body>
- 保留传入的内容片段（CONTENT）原样不修改
- 必须使用 Tailwind CSS 类，并尽量匹配页面上下文风格
- 所有提示文字使用中文
`,
    });

    const prompt = `
插入类型: ${type}

上下文 HTML（截断）:
${(contextHtml || "").slice(0, 1800)}

上下文文字（截断）:
${(contextText || "").slice(0, 600)}

需要插入的内容片段（必须原样保留）:
<CONTENT>
${contentHtml}
</CONTENT>
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("AI response was not valid JSON");
      }
    }

    return res.status(200).json(parsed);
  } catch (error) {
    console.error("Insert API Error:", error);
    return res.status(500).json({ error: error.message || "Insert generation failed" });
  }
}
