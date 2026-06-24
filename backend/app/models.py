from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="user")          # user | admin
    theme = Column(String, default="dark")
    created_at = Column(DateTime, default=datetime.utcnow)

    scans = relationship("ScanHistory", back_populates="user")
    api_keys = relationship("APIKey", back_populates="user")
    whitelisted_domains = relationship("WhitelistedDomain", back_populates="user")
    email_alerts = relationship("EmailAlert", back_populates="user")


class ScanHistory(Base):
    __tablename__ = "scan_history"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(Text, nullable=False)
    prediction = Column(String, nullable=False)     # legitimate | suspicious | phishing
    risk_score = Column(Float, nullable=False)
    features = Column(Text)                         # JSON
    virustotal_result = Column(Text)                # JSON
    whois_result = Column(Text)                     # JSON
    ssl_result = Column(Text)                       # JSON
    redirect_chain = Column(Text)                   # JSON list
    typosquatting = Column(Text)                    # JSON list of brand matches
    scanned_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user = relationship("User", back_populates="scans")


class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    key_hash = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="api_keys")


class WhitelistedDomain(Base):
    __tablename__ = "whitelisted_domains"

    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, nullable=False, index=True)
    added_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="whitelisted_domains")


class EmailAlert(Base):
    __tablename__ = "email_alerts"

    id = Column(Integer, primary_key=True, index=True)
    enabled = Column(Boolean, default=True)
    min_risk_score = Column(Float, default=60.0)   # only alert above this threshold
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    user = relationship("User", back_populates="email_alerts")


class BannedDomain(Base):
    __tablename__ = "banned_domains"

    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, unique=True, index=True, nullable=False)
    reason = Column(String, nullable=True)
    banned_at = Column(DateTime, default=datetime.utcnow)
    banned_by = Column(Integer, ForeignKey("users.id"), nullable=True)
