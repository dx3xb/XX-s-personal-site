from datetime import datetime
from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.orm import declarative_base


Base = declarative_base()


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, index=True)
    status = Column(String, nullable=False, default="pending")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    request_payload = Column(Text, nullable=False, default="{}")
    logs = Column(Text, nullable=False, default="")
    report_html = Column(Text, nullable=True)
    report_markdown = Column(Text, nullable=True)
    report_path = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
