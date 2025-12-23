import { NextResponse } from "next/server";
import { GenAiCode } from '@/configs/AiModel';

function extractJson(text) {
    if (!text) return null;
    const fence = text.match(/```(?:json)?\\s*([\\s\\S]*?)```/i);
    const candidate = fence ? fence[1] : text;
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        return null;
    }
    return candidate.slice(firstBrace, lastBrace + 1);
}

async function generateImage(prompt, size) {
    const apiKey = process.env.ARK_API_KEY;
    if (!apiKey) {
        throw new Error("ARK_API_KEY is not configured");
    }
    const resp = await fetch(
        "https://ark.cn-beijing.volces.com/api/v3/images/generations",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "doubao-seedream-4-0-250828",
                prompt,
                response_format: "url",
                size: size || "2K",
                watermark: false,
            }),
        }
    );
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Image API failed: ${text}`);
    }
    const data = await resp.json();
    const url = data?.data?.[0]?.url;
    if (!url) {
        throw new Error("Image API returned no url");
    }
    return url;
}

function replacePlaceholders(files, imageMap) {
    const replaced = {};
    Object.entries(files || {}).forEach(([path, content]) => {
        if (typeof content === "string") {
            let next = content;
            Object.entries(imageMap).forEach(([id, url]) => {
                next = next.split(`{{image:${id}}}`).join(url);
            });
            replaced[path] = next;
            return;
        }
        if (content && typeof content === "object") {
            const code = typeof content.code === "string" ? content.code : "";
            let next = code;
            Object.entries(imageMap).forEach(([id, url]) => {
                next = next.split(`{{image:${id}}}`).join(url);
            });
            replaced[path] = { ...content, code: next };
            return;
        }
        replaced[path] = content;
    });
    return replaced;
}

export async function POST(req) {
    const { prompt } = await req.json();
    try {
        const result = await GenAiCode.sendMessage(prompt);
        const raw = result?.response?.text?.() || "";
        const jsonText = extractJson(raw);
        if (!jsonText) {
            return NextResponse.json(
                { error: "AI response is not valid JSON" },
                { status: 500 }
            );
        }
        const payload = JSON.parse(jsonText);
        const imagePrompts = Array.isArray(payload.image_prompts)
            ? payload.image_prompts
            : [];
        if (imagePrompts.length > 0) {
            const imageMap = {};
            for (const item of imagePrompts) {
                if (!item?.id || !item?.prompt) continue;
                imageMap[item.id] = await generateImage(
                    item.prompt,
                    item.size
                );
            }
            payload.files = replacePlaceholders(payload.files, imageMap);
            payload.image_assets = imageMap;
        }
        return NextResponse.json(payload);
    } catch (e) {
        return NextResponse.json(
            { error: e?.message || "AI generation failed" },
            { status: 500 }
        );
    }
}
