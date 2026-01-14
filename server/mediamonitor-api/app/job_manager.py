import asyncio
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from .models import Job


class JobManager:
    def __init__(self, session_factory, repo_root: Path) -> None:
        self.session_factory = session_factory
        self.repo_root = repo_root
        self.vendor_root = repo_root / "vendor" / "BettaFish"
        self._processes: dict[str, asyncio.subprocess.Process] = {}
        self._cancelled: set[str] = set()
        max_concurrency = int(os.environ.get("MEDIAMONITOR_MAX_CONCURRENCY", "1"))
        self._semaphore = asyncio.Semaphore(max(1, max_concurrency))

    def create_job(self, payload: Dict[str, Any]) -> str:
        job_id = str(uuid.uuid4())
        with self.session_factory() as session:
            job = Job(
                id=job_id,
                status="pending",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                request_payload=json.dumps(payload, ensure_ascii=False),
                logs="",
            )
            session.add(job)
            session.commit()
        return job_id

    async def run_job(self, job_id: str) -> None:
        payload = self._get_payload(job_id)
        if payload is None:
            return

        async with self._semaphore:
            self._update_status(job_id, "running")
            try:
                if self._is_canceled(job_id):
                    self._update_status(job_id, "canceled")
                    return
                await self._run_mindspider(job_id, payload)
                if self._is_canceled(job_id):
                    self._update_status(job_id, "canceled")
                    return
                await self._run_report_engine(job_id, payload)
                if self._is_canceled(job_id):
                    self._update_status(job_id, "canceled")
                    return
                report_html, report_markdown, report_path = self._load_latest_report()
                self._store_report(job_id, report_html, report_markdown, report_path)
                self._update_status(job_id, "completed")
            except Exception as exc:
                if self._is_canceled(job_id):
                    self._append_log(job_id, "[info] 任务已取消")
                    self._update_status(job_id, "canceled")
                else:
                    self._append_log(job_id, f"[error] {exc}")
                    self._update_status(job_id, "failed", error=str(exc))
            finally:
                self._processes.pop(job_id, None)
                self._cancelled.discard(job_id)

    def cancel_job(self, job_id: str) -> bool:
        self._cancelled.add(job_id)
        proc = self._processes.get(job_id)
        if proc and proc.returncode is None:
            try:
                proc.terminate()
            except ProcessLookupError:
                pass
            return True
        return False

    async def _run_mindspider(self, job_id: str, payload: Dict[str, Any]) -> None:
        cmd = [self._python_exec(), "-u", "MindSpider/main.py"]

        target_date = payload.get("date")
        if target_date:
            cmd.extend(["--date", target_date])

        platforms = payload.get("platforms") or []
        if platforms:
            cmd.extend(["--platforms", *platforms])

        keywords_count = payload.get("keywords_count")
        if keywords_count:
            cmd.extend(["--keywords-count", str(keywords_count)])

        max_keywords = payload.get("max_keywords")
        if max_keywords:
            cmd.extend(["--max-keywords", str(max_keywords)])

        max_notes = payload.get("max_notes")
        if max_notes:
            cmd.extend(["--max-notes", str(max_notes)])

        if payload.get("test_mode"):
            cmd.append("--test")

        await self._run_command(job_id, cmd, self.vendor_root)

    async def _run_report_engine(self, job_id: str, payload: Dict[str, Any]) -> None:
        query = payload.get("query") or "舆情分析报告"
        self._ensure_engine_reports(query)
        cmd = [self._python_exec(), "-u", "report_engine_only.py", "--query", query]
        if payload.get("skip_pdf", True):
            cmd.append("--skip-pdf")
        if payload.get("skip_markdown"):
            cmd.append("--skip-markdown")

        await self._run_command(job_id, cmd, self.vendor_root)

    async def _run_command(self, job_id: str, cmd: list[str], cwd: Path) -> None:
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"
        env["PYTHONPATH"] = str(self.vendor_root)

        process = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=str(cwd),
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        self._processes[job_id] = process

        async def _drain(stream, label: str) -> None:
            if not stream:
                return
            while True:
                if self._is_canceled(job_id):
                    break
                line = await stream.readline()
                if not line:
                    break
                text = line.decode(errors="ignore").rstrip()
                if text:
                    self._append_log(job_id, f"[{label}] {text}")

        await asyncio.gather(_drain(process.stdout, "stdout"), _drain(process.stderr, "stderr"))
        return_code = await process.wait()
        if return_code != 0:
            raise RuntimeError(f"命令执行失败 (exit {return_code}): {' '.join(cmd)}")

    def _load_latest_report(self) -> tuple[Optional[str], Optional[str], Optional[str]]:
        report_dir = self.vendor_root / "final_reports"
        if not report_dir.exists():
            return None, None, None
        html_files = list(report_dir.rglob("*.html"))
        md_files = list(report_dir.rglob("*.md"))
        latest_html = max(html_files, key=lambda p: p.stat().st_mtime) if html_files else None
        latest_md = max(md_files, key=lambda p: p.stat().st_mtime) if md_files else None
        try:
            html_content = latest_html.read_text(encoding="utf-8") if latest_html else None
        except Exception:
            html_content = None
        try:
            md_content = latest_md.read_text(encoding="utf-8") if latest_md else None
        except Exception:
            md_content = None
        path_value = str(latest_html) if latest_html else (str(latest_md) if latest_md else None)
        return html_content, md_content, path_value

    def _ensure_engine_reports(self, query: str) -> None:
        engine_dirs = {
            "insight": self.vendor_root / "insight_engine_streamlit_reports",
            "media": self.vendor_root / "media_engine_streamlit_reports",
            "query": self.vendor_root / "query_engine_streamlit_reports",
        }
        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        for name, directory in engine_dirs.items():
            directory.mkdir(parents=True, exist_ok=True)
            existing = list(directory.glob("*.md"))
            if existing:
                continue
            placeholder = (
                f"# {name.capitalize()} Engine Report\n\n"
                f"- 查询: {query}\n"
                f"- 说明: 暂无可用的引擎报告文件，使用占位内容生成总报告。\n"
                f"- 生成时间: {datetime.utcnow().isoformat()}Z\n"
            )
            report_path = directory / f"{name}_placeholder_{timestamp}.md"
            report_path.write_text(placeholder, encoding="utf-8")

    def _python_exec(self) -> str:
        return os.environ.get("PYTHON_EXECUTABLE", "python")

    def _append_log(self, job_id: str, line: str) -> None:
        with self.session_factory() as session:
            job = session.get(Job, job_id)
            if not job:
                return
            job.logs = (job.logs or "") + line + "\n"
            job.updated_at = datetime.utcnow()
            session.commit()

    def _update_status(self, job_id: str, status: str, error: Optional[str] = None) -> None:
        with self.session_factory() as session:
            job = session.get(Job, job_id)
            if not job:
                return
            job.status = status
            if error:
                job.error = error
            job.updated_at = datetime.utcnow()
            session.commit()

    def _store_report(
        self,
        job_id: str,
        report_html: Optional[str],
        report_markdown: Optional[str],
        report_path: Optional[str],
    ) -> None:
        with self.session_factory() as session:
            job = session.get(Job, job_id)
            if not job:
                return
            job.report_html = report_html
            job.report_markdown = report_markdown
            job.report_path = report_path
            job.updated_at = datetime.utcnow()
            session.commit()

    def _get_payload(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self.session_factory() as session:
            job = session.get(Job, job_id)
            if not job:
                return None
            try:
                return json.loads(job.request_payload or "{}")
            except json.JSONDecodeError:
                return {}

    def _is_canceled(self, job_id: str) -> bool:
        return job_id in self._cancelled
