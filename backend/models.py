from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    color = Column(String, default="#3B82F6")
    avatar_url = Column(String, nullable=True)
    can_approve = Column(Boolean, default=False)
    email = Column(String, nullable=True)

    entries = relationship("Entry", back_populates="user", cascade="all, delete-orphan")


class Entry(Base):
    __tablename__ = "entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    location = Column(String, nullable=False)  # "rome" | "mallorca"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    note = Column(String, nullable=True)
    participants = Column(String, nullable=True, default="")  # comma-separated names
    status = Column(String, default="approved")  # "pending" | "approved"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="entries")
