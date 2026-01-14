"use client";
import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import {
  SandpackProvider,
  SandpackPreview,
} from "@codesandbox/sandpack-react";
import Lookup from "@/data/Lookup";

function PublishedPreview() {
  const params = useParams();
  const tokenId = params?.token;
  const data = useQuery(api.workspace.GetPublishedByToken, tokenId ? { tokenId } : "skip");

  if (data === null) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">链接已失效或不存在</div>
          <div className="text-black/60 text-sm">请联系发布者获取新链接。</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        加载中...
      </div>
    );
  }

  const files = data.files || {};
  if (!Object.keys(files).length) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="text-sm text-black/60">发布内容缺失，请重新发布。</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <SandpackProvider
        files={{ ...Lookup.DEFAULT_FILE, ...files }}
        template="react"
        customSetup={{
          dependencies: {
            ...Lookup.DEPENDANCY,
          },
          entry: "/index.js",
        }}
        options={{
          bundlerTimeoutSecs: 120,
          recompileMode: "immediate",
          recompileDelay: 300,
        }}
      >
        <SandpackPreview
          style={{ height: "100vh", borderRadius: 0 }}
          showNavigator={false}
          showOpenInCodeSandbox={false}
          iframeProps={{
            allow: "clipboard-read; clipboard-write",
            sandbox: "allow-scripts allow-same-origin allow-forms allow-popups",
          }}
        />
      </SandpackProvider>
    </div>
  );
}

export default PublishedPreview;
