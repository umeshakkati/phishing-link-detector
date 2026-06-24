# Contributing to PhishGuard AI

## Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and add tests where applicable
4. Run tests: `pytest tests/` (backend), `npm run build` (frontend)
5. Commit: `git commit -m "feat: describe your change"`
6. Push and open a Pull Request

## Project Structure

```
phishing-link-detector/
├── backend/              # FastAPI Python backend
│   ├── app/
│   │   ├── routers/      # API route handlers
│   │   ├── models.py     # SQLAlchemy DB models
│   │   ├── schemas.py    # Pydantic request/response schemas
│   │   ├── auth.py       # JWT authentication
│   │   ├── config.py     # Settings via .env
│   │   ├── feature_extractor.py  # URL feature engineering
│   │   └── threat_intel.py       # VirusTotal, WHOIS, SSL, etc.
│   ├── scripts/
│   │   └── train_model.py        # ML model training
│   └── tests/            # pytest test suite
├── frontend/             # React + Tailwind CSS frontend
│   └── src/
│       ├── pages/        # Route-level page components
│       ├── components/   # Reusable UI components
│       ├── c