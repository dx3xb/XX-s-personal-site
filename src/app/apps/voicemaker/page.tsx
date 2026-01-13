"use client";

import Script from "next/script";
import React, { useState, useRef, useEffect } from "react";
import {
  Loader2,
  Play,
  Download,
  Volume2,
  VolumeX,
  Sparkles,
  Upload,
  Mic,
  X,
} from "lucide-react";

type GenerationRecord = {
  id: string;
  audio_url: string;
  file_name: string;
  file_size: number;
  created_at: string;
};

type VoiceOption = {
  id: string;
  name: string;
};

export default function VoicemakerPage() {
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentRecord, setCurrentRecord] = useState<GenerationRecord | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  
  // 自定义音色相关状态
  const [showCreateVoice, setShowCreateVoice] = useState(false);
  const [voiceName, setVoiceName] = useState("");
  const [voiceDescription, setVoiceDescription] = useState("");
  const [speakerId, setSpeakerId] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isCreatingVoice, setIsCreatingVoice] = useState(false);

  // 加载豆包音色列表
  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    setIsLoadingVoices(true);
    try {
      const response = await fetch("/api/voicemaker/voices");
      const data = await response.json();
      if (data.ok) {
        const voiceList = Array.isArray(data.voices)
          ? (data.voices as VoiceOption[])
          : [];
        setVoices(voiceList);
        if (voiceList.length > 0 && !voiceList.some((voice) => voice.id === voiceId)) {
          setVoiceId(voiceList[0].id);
        }
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error("加载音色失败:", err);
      setError("加载音色失败，请稍后重试");
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError("请输入要生成的文本内容");
      return;
    }

    if (!voiceId) {
      setError("请选择音色");
      return;
    }

    if (text.length > 2000) {
      setError("文本内容不能超过2000个字符");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setCurrentRecord(null);
    setIsPlaying(false);

    try {
      const response = await fetch("/api/voicemaker/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          voice_id: voiceId,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "生成失败");
      }

      setCurrentRecord({
        id: data.id,
        audio_url: data.audio_url,
        file_name: data.file_name,
        file_size: data.file_size,
        created_at: data.created_at,
      });
    } catch (err: any) {
      setError(err?.message || "生成语音失败，请稍后重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateVoice = async () => {
    if (!voiceName.trim()) {
      setError("请输入音色名称");
      return;
    }

    if (!speakerId.trim()) {
      setError("请输入 SpeakerID");
      return;
    }

    if (!audioFile) {
      setError("请选择音频文件");
      return;
    }

    setIsCreatingVoice(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("name", voiceName.trim());
      formData.append("description", voiceDescription.trim());
      formData.append("speaker_id", speakerId.trim());
      if (voiceLanguage) {
        formData.append("language", voiceLanguage);
      }
      formData.append("audio", audioFile);

      const response = await fetch("/api/voicemaker/custom-voice/create", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "创建失败");
      }

      // 重置表单
      setVoiceName("");
      setVoiceDescription("");
      setSpeakerId("");
      setVoiceLanguage("");
      setAudioFile(null);
      setShowCreateVoice(false);
      
      // 重新加载豆包音色列表
      await loadVoices();
      
      alert("音色创建成功！正在训练中，训练完成后即可使用。");
    } catch (err: any) {
      setError(err?.message || "创建自定义音色失败");
    } finally {
      setIsCreatingVoice(false);
    }
  };

  const handlePlay = () => {
    if (!audioRef.current || !currentRecord) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!currentRecord) return;
    window.open(`/api/voicemaker/download/${currentRecord.id}`, "_blank");
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleAudioPlay = () => {
    setIsPlaying(true);
  };

  const handleAudioPause = () => {
    setIsPlaying(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 验证文件类型
      const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav"];
      if (!allowedTypes.includes(file.type)) {
        setError("请上传 MP3 或 WAV 格式的音频文件");
        return;
      }
      setAudioFile(file);
      setError(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-slate-100">
      <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />

      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-purple-500/20 to-blue-500/20">
              <Sparkles className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                xxlab.io
              </p>
              <h1 className="text-2xl font-semibold text-white">Voicemaker</h1>
              <p className="text-sm text-slate-400">
                AI 文字转语音工具 - 使用豆包 App 音色与声音复刻
              </p>
            </div>
          </div>
        </div>

        {/* 创建自定义音色按钮 */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowCreateVoice(!showCreateVoice)}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-purple-500/50 hover:bg-purple-500/10"
          >
            <Mic className="h-4 w-4" />
            {showCreateVoice ? "取消创建" : "创建自定义音色"}
          </button>
        </div>

        {/* 创建自定义音色表单 */}
        {showCreateVoice && (
          <div className="mb-6 rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-white">创建自定义音色（声音复刻）</h2>
            <p className="mb-4 text-xs text-slate-400">
              上传至少 5 秒的清晰音频样本，系统将训练并创建你的专属音色
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-400">
                  音色名称
                </label>
                <input
                  type="text"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder="例如：我的声音"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-400">
                  SpeakerID（控制台获取）
                </label>
                <input
                  type="text"
                  value={speakerId}
                  onChange={(e) => setSpeakerId(e.target.value)}
                  placeholder="例如：S_xxxxxxxx"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-400">
                  训练语种（非中文时建议选择）
                </label>
                <select
                  value={voiceLanguage}
                  onChange={(e) => setVoiceLanguage(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="">自动/不指定</option>
                  <option value="0">中文</option>
                  <option value="1">英文</option>
                  <option value="7">法语</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-400">
                  描述（可选）
                </label>
                <input
                  type="text"
                  value={voiceDescription}
                  onChange={(e) => setVoiceDescription(e.target.value)}
                  placeholder="例如：我的个人音色"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-400">
                  音频文件（MP3 或 WAV，至少 5 秒）
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white transition hover:border-purple-500/50">
                    <Upload className="h-4 w-4" />
                    {audioFile ? audioFile.name : "选择文件"}
                    <input
                      type="file"
                      accept="audio/mpeg,audio/mp3,audio/wav,audio/wave"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {audioFile && (
                    <button
                      onClick={() => setAudioFile(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={handleCreateVoice}
                disabled={isCreatingVoice || !voiceName.trim() || !speakerId.trim() || !audioFile}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:from-purple-600 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingVoice ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    创建音色
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
          {/* Input Section */}
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-8 shadow-2xl shadow-black/40">
            <div className="mb-6">
              <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                文本内容
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="请输入要转换为语音的文本内容..."
                className="w-full min-h-[200px] rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                maxLength={2000}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>最多 2000 个字符</span>
                <span>{text.length}/2000</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                选择音色
              </label>
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                {isLoadingVoices && (
                  <option value="" disabled>
                    正在加载音色...
                  </option>
                )}
                {!isLoadingVoices && voices.length === 0 && (
                  <option value="" disabled>
                    暂无可用音色
                  </option>
                )}
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !text.trim() || !voiceId}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-4 text-sm font-semibold text-white transition hover:from-purple-600 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  生成语音
                </>
              )}
            </button>
          </div>

          {/* Output Section */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              生成结果
            </h2>

            {!currentRecord && !isGenerating && (
              <div className="flex h-[300px] flex-col items-center justify-center text-center text-slate-400">
                <Volume2 className="mb-3 h-12 w-12 opacity-30" />
                <p className="text-sm">生成后的语音将显示在这里</p>
              </div>
            )}

            {isGenerating && (
              <div className="flex h-[300px] flex-col items-center justify-center text-center text-slate-400">
                <Loader2 className="mb-3 h-12 w-12 animate-spin text-purple-400" />
                <p className="text-sm">正在生成语音，请稍候...</p>
              </div>
            )}

            {currentRecord && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs text-slate-400">文件信息</span>
                    <span className="text-xs text-slate-500">
                      {currentRecord.file_size
                        ? `${(currentRecord.file_size / 1024).toFixed(1)} KB`
                        : "未知"}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300">
                    {currentRecord.file_name}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handlePlay}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-purple-500/50 hover:bg-purple-500/10"
                  >
                    {isPlaying ? (
                      <>
                        <VolumeX className="h-4 w-4" />
                        暂停
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        播放
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-blue-500/50 hover:bg-blue-500/10"
                  >
                    <Download className="h-4 w-4" />
                    下载
                  </button>
                </div>

                <audio
                  ref={audioRef}
                  src={currentRecord.audio_url}
                  onEnded={handleAudioEnded}
                  onPlay={handleAudioPlay}
                  onPause={handleAudioPause}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-300">使用说明</h3>
          <ul className="space-y-2 text-xs text-slate-400">
            <li>• 音色列表来自豆包 App 预设/自定义音色</li>
            <li>• <strong>声音复刻</strong>：上传至少 5 秒的清晰音频，创建你的专属音色</li>
            <li>• 输入要转换的文本内容（最多 2000 个字符）</li>
            <li>• 生成后可以播放试听或下载音频文件</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
