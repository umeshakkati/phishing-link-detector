# AI-Powered Phishing Link Detection & Threat Intelligence Platform

A professional-grade cybersecurity platform that detects phishing URLs in real time using machine learning, domain intelligence, SSL validation, VirusTotal API, and QR code scanning.

---

## Features

- **ML-based URL classification** — Random Forest model with 28 extracted features
- **VirusTotal API integration** — cross-reference URLs against 70+ threat engines
- **WHOIS domain analysis** — detects newly registered domains (common in phishing)
- **SSL/TLS certificate validation** — checks expiry, issuer, and HTTPS usage
- **QR code phishing detection** — extract and scan URLs from uploaded QR images
- **Threat dashboard** — scan history, risk charts, and detection statistics
- **Chrome extension** — real-time warnings while browsing
- **Role-based auth** — JWT-secured user accounts
- **REST API** — fully documented via `/docs` (Swagger UI)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, Tailwind CSS, Recharts |
| Backend | FastAPI (Python 3.11) |
| ML | Scikit-learn, Random Forest |
| Database | PostgreSQL (SQLite for dev) |
| Auth | JWT (python-jose, passlib) |
| Threat Intel | VirusTotal API, python-whois, pyOpenSSL |
| QR Scanning | pyzbar, Pillow |
| Deployment | Docker, Docker Compose, GitHub Actions |

---

## Quick Start

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate      # Linux/Mac

pip install -r requirements.txt

# Train the ML model (generates synthetic data if no CSV provided)
python train_model.py
# With real dataset:
# python train_model.py --dataset ../dataset/phishing.csv

# Copy and configure environment
copy .env.example .env        # Windows
# cp .env.example .env         # Linux/Mac
# Edit .env — add your VIRUSTOTAL_API_KEY

# Start API server
python app.py
# API docs at: http://localhost:8000/docs
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# Open http://localhost:5173
```

### 3. Docker (Full Stack)

```bash
# From project root
docker-compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000/docs
```

---

## Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer Mode**
3. Click **Load unpacked** → select `chrome-extension/` folder
4. Browse any site — the extension scans URLs automatically

---

## Dataset

Place `phishing.csv` in `dataset/` with columns: `url`, `label` (0=legit, 1=suspicious, 2=phishing).

See `dataset/README.md` for recommended sources including Kaggle and PhishTank.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scan/url` | Scan a URL |
| POST | `/api/scan/qr` | Scan a QR code image |
| GET | `/api/scan/history` | Get scan history |
| GET | `/api/scan/stats` | Get detection statistics |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Current user info |

---

## Resume Description

> AI-Powered Phishing Link Detection and Threat Intelligence Platform — Designed and developed a machine learning-based cybersecurity solution for real-time phishing URL detection, domain reputation analysis, and threat intelligence integration. Implemented advanced security features including WHOIS analysis, SSL validation, QR code scanning, and risk-based threat reporting through an interactive web dashboard.
