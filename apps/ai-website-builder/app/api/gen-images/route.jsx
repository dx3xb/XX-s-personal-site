import { NextResponse } from "next/server";

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

export async function POST(req) {
    try {
        const { images } = await req.json();
        if (!Array.isArray(images) || images.length === 0) {
            return NextResponse.json(
                { error: "images array is required" },
                { status: 400 }
            );
        }
        const results = [];
        const errors = [];
        for (const item of images) {
            const id = item?.id;
            const prompt = item?.prompt;
            const size = item?.size;
            if (!id || !prompt) {
                errors.push({
                    id: id || "unknown",
                    error: "id and prompt are required",
                });
                continue;
            }
            try {
                const url = await generateImage(prompt, size);
                results.push({ id, url });
            } catch (err) {
                errors.push({ id, error: err?.message || "generate failed" });
            }
        }
        return NextResponse.json({ images: results, errors });
    } catch (e) {
        return NextResponse.json(
            { error: e?.message || "Image generation failed" },
            { status: 500 }
        );
    }
}
