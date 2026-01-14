"use client";
import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Trash2 } from "lucide-react";

function ProjectList() {
    const projects = useQuery(api.workspace.ListWorkspaces);
    const updateMeta = useMutation(api.workspace.UpdateWorkspaceMeta);
    const softDelete = useMutation(api.workspace.SoftDeleteWorkspace);
    const restoreWorkspace = useMutation(api.workspace.RestoreWorkspace);
    const hardDelete = useMutation(api.workspace.HardDeleteWorkspace);
    const deletedProjects = useQuery(api.workspace.ListDeletedWorkspaces);
    const [editingId, setEditingId] = useState(null);
    const [titleDraft, setTitleDraft] = useState("");
    const [showTrash, setShowTrash] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const startEdit = (project) => {
        setEditingId(project._id);
        setTitleDraft(project.title || "未命名项目");
    };

    const saveEdit = async (projectId) => {
        await updateMeta({
            workspaceId: projectId,
            title: titleDraft.trim() || "未命名项目",
        });
        setEditingId(null);
        setTitleDraft("");
    };

    const removeProject = async (projectId) => {
        await softDelete({ workspaceId: projectId });
        setConfirmDeleteId(null);
    };

    if (!projects) return null;

    return (
        <div className="w-full max-w-5xl bg-black rounded-2xl p-6 border border-red-500">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl text-white font-semibold">项目列表</h2>
                <button
                    onClick={() => setShowTrash(true)}
                    className="flex items-center gap-2 text-sm text-white hover:text-red-500"
                >
                    <Trash2 className="h-4 w-4" />
                    回收站
                </button>
            </div>
            {projects.length === 0 && (
                <div className="text-white text-sm">暂无项目</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((project) => (
                    <div
                        key={project._id}
                        className="border border-red-500 rounded-xl p-5 bg-white shadow-[0_0_18px_rgba(239,68,68,0.15)]"
                    >
                        <div className="flex items-center justify-between gap-3">
                            {editingId === project._id ? (
                                <input
                                    value={titleDraft}
                                    onChange={(e) => setTitleDraft(e.target.value)}
                                    className="flex-1 bg-white border border-red-500 rounded-md p-2 text-black text-sm"
                                />
                            ) : (
                                <div className="text-black text-base font-medium">
                                    项目名称：{project.title || "未命名项目"}
                                </div>
                            )}
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-2">
                            <Link
                                href={`/workspace/${project._id}`}
                                className="text-xs px-3 py-1 rounded-full bg-black text-white"
                            >
                                进入项目
                            </Link>
                            <div className="flex items-center gap-2">
                                {editingId === project._id ? (
                                    <button
                                        onClick={() => saveEdit(project._id)}
                                        className="text-xs px-3 py-1 rounded-full bg-white text-black border border-red-500"
                                    >
                                        保存名称
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => startEdit(project)}
                                        className="text-xs px-3 py-1 rounded-full bg-white text-black border border-red-500"
                                    >
                                        编辑名称
                                    </button>
                                )}
                                <button
                                    onClick={() => setConfirmDeleteId(project._id)}
                                    className="text-xs px-3 py-1 rounded-full bg-red-500 text-white"
                                >
                                    删除项目
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {confirmDeleteId && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                        <h3 className="text-black text-lg font-semibold mb-2">确认删除？</h3>
                        <p className="text-black text-sm mb-6">
                            删除后将进入回收站，可从回收站恢复。
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-4 py-2 rounded-lg border border-red-500 text-black"
                            >
                                取消
                            </button>
                            <button
                                onClick={() => removeProject(confirmDeleteId)}
                                className="px-4 py-2 rounded-lg bg-red-500 text-white"
                            >
                                确认删除
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTrash && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-black text-lg font-semibold">回收站</h3>
                            <button
                                onClick={() => setShowTrash(false)}
                                className="text-black hover:text-red-500"
                            >
                                关闭
                            </button>
                        </div>
                        {!deletedProjects || deletedProjects.length === 0 ? (
                            <div className="text-black text-sm">暂无已删除项目</div>
                        ) : (
                            <div className="space-y-3">
                                {deletedProjects.map((project) => (
                                    <div
                                        key={project._id}
                                        className="border border-red-500 rounded-lg p-3 flex items-center justify-between"
                                    >
                                        <div className="text-black text-sm">
                                            {project.title || "未命名项目"}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => restoreWorkspace({ workspaceId: project._id })}
                                                className="text-xs px-3 py-1 rounded-full bg-black text-white"
                                            >
                                                恢复项目
                                            </button>
                                            <button
                                                onClick={() => hardDelete({ workspaceId: project._id })}
                                                className="text-xs px-3 py-1 rounded-full bg-red-500 text-white"
                                            >
                                                彻底删除
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProjectList;
