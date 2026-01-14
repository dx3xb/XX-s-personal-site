import asyncio
import json
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .db import SessionLocal, engine
from .job_manager import JobManager
from .models import Base, Job


Base.metadata.create_all(bind=engine)


def _ensure_schema() -> None:
    if not str(engine.url).startswith("sqlite"):
        return
    with engine.begin() as conn:
        result = conn.exec_driver_sql("PRAGMA table_info(jobs)")
        columns = {row[1] for row in result}
        if "report_markdown" not in columns:
            conn.exec_driver_sql("ALTER TABLE jobs ADD COLUMN report_markdown TEXT")


_ensure_schema()

app = FastAPI(title="MediaMonitor API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

repo_root = Path(__file__).resolve().parents[1]
job_manager = JobManager(SessionLocal, repo_root)


class JobRequest(BaseModel):
    query: str = Field(..., description="搜索/分析主题")
    date: Optional[str] = Field(None, description="目标日期 YYYY-MM-DD")
    platforms: Optional[List[str]] = Field(None, description="指定爬取平台")
    keywords_count: int = Field(100, description="话题提取关键词数量")
    max_keywords: int = Field(50, description="每个平台关键词数量")
    max_notes: int = Field(50, description="每个关键词爬取内容数量")
    test_mode: bool = Field(False, description="测试模式")
    skip_pdf: bool = Field(True, description="跳过 PDF 生成")
    skip_markdown: bool = Field(False, description="跳过 Markdown 生成")


class JobResponse(BaseModel):
    job_id: str


class JobSummary(BaseModel):
    id: str
    status: str
    created_at: str
    updated_at: str
    query: str


class JobStatusResponse(BaseModel):
    id: str
    status: str
    logs: str
    report_html: Optional[str]
    report_markdown: Optional[str]
    report_path: Optional[str]
    error: Optional[str]
    request_payload: dict
    created_at: str
    updated_at: str


@app.post("/api/v1/jobs", response_model=JobResponse)
async def create_job(payload: JobRequest) -> JobResponse:
    job_id = job_manager.create_job(payload.model_dump())
    asyncio.create_task(job_manager.run_job(job_id))
    return JobResponse(job_id=job_id)


@app.get("/api/v1/jobs", response_model=list[JobSummary])
def list_jobs(limit: int = 20) -> list[JobSummary]:
    with SessionLocal() as session:
        jobs = session.query(Job).order_by(Job.created_at.desc()).limit(limit).all()
        summaries = []
        for job in jobs:
            try:
                payload = json.loads(job.request_payload or "{}")
            except json.JSONDecodeError:
                payload = {}
            summaries.append(
                JobSummary(
                    id=job.id,
                    status=job.status,
                    created_at=job.created_at.isoformat(),
                    updated_at=job.updated_at.isoformat(),
                    query=payload.get("query") or "未命名任务",
                )
            )
        return summaries


@app.delete("/api/v1/jobs/{job_id}")
def delete_job(job_id: str) -> dict:
    with SessionLocal() as session:
        job = session.get(Job, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if job.status in {"running", "pending"}:
            job_manager.cancel_job(job_id)
        session.delete(job)
        session.commit()
    return {"status": "deleted"}


@app.post("/api/v1/jobs/{job_id}/cancel")
async def cancel_job(job_id: str) -> dict:
    with SessionLocal() as session:
        job = session.get(Job, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if job.status in {"completed", "failed", "canceled"}:
            return {"status": job.status}
        from datetime import datetime

        job.status = "canceled"
        job.updated_at = datetime.utcnow()
        session.commit()
    job_manager.cancel_job(job_id)
    return {"status": "canceled"}


@app.get("/api/v1/jobs/{job_id}/download")
def download_report(job_id: str):
    with SessionLocal() as session:
        job = session.get(Job, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if job.report_html:
            filename = f"mediamonitor-{job_id[:8]}.html"
            return Response(
                content=job.report_html,
                media_type="text/html",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
        if job.report_markdown:
            filename = f"mediamonitor-{job_id[:8]}.md"
            return Response(
                content=job.report_markdown,
                media_type="text/markdown",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
        if job.report_path:
            path = Path(job.report_path)
            if path.exists():
                return FileResponse(path)
        raise HTTPException(status_code=404, detail="Report not found")


@app.get("/api/v1/jobs/{job_id}", response_model=JobStatusResponse)
def get_job(job_id: str) -> JobStatusResponse:
    with SessionLocal() as session:
        job = session.get(Job, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        try:
            payload = json.loads(job.request_payload or "{}")
        except json.JSONDecodeError:
            payload = {}
        return JobStatusResponse(
            id=job.id,
            status=job.status,
            logs=job.logs or "",
            report_html=job.report_html,
            report_markdown=job.report_markdown,
            report_path=job.report_path,
            error=job.error,
            request_payload=payload,
            created_at=job.created_at.isoformat(),
            updated_at=job.updated_at.isoformat(),
        )
