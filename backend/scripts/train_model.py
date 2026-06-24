"""
Train the phishing detection model.

Usage:
    python train_model.py --dataset ../dataset/phishing.csv

The CSV must have a column 'url' and 'label' (0=legitimate, 1=suspicious, 2=phishing).
A pre-built synthetic dataset is generated if no CSV is provided.
"""

import argparse
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from app.feature_extractor import extract_features, features_to_vector


LEGIT_URLS = [
    "https://www.google.com",
    "https://www.github.com/torvalds/linux",
    "https://stackoverflow.com/questions/1234",
    "https://www.wikipedia.org/wiki/Python",
    "https://www.amazon.com/dp/B09G9HD6PD",
    "https://mail.google.com/mail/u/0/",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://docs.python.org/3/library/",
    "https://www.microsoft.com/en-us",
    "https://www.linkedin.com/in/johndoe",
]

PHISHING_URLS = [
    "http://192.168.1.1/login/verify?account=user@bank.com",
    "http://paypal-secure-login.tk/update/credentials",
    "https://amazon-account-verify.ml/signin?redirect=https://real.amazon.com",
    "http://secure-banking-update.xyz/account/login.php",
    "http://xn--pple-43d.com/login",
    "http://google.com@malicious-phishing-site.ml/steal",
    "https://verify-your-account-immediately.tk/signin/facebook",
    "http://192.0.2.1:8080/paypal/update/confirm",
    "https://login-secure-paypal-verification.ml/account/restore",
    "http://microsoftonline-login-secure.xyz/%61%64%6d%69%6e",
]

SUSPICIOUS_URLS = [
    "http://login.example-bank.com/verify",
    "https://secure-update.somebank.net/account",
    "http://paypal.login-verification.com",
    "https://account-verify.banksite.org/update",
    "http://signin.google-account-help.com",
]


def generate_synthetic_data(n_legit=500, n_phishing=500, n_suspicious=200):
    """Generate a synthetic training dataset by augmenting known URLs."""
    rows = []

    base_legit = [
        "https://www.{domain}.com/{path}",
        "https://{sub}.{domain}.org/{path}",
        "https://docs.{domain}.io/reference/{path}",
    ]
    legit_domains = ["github", "google", "microsoft", "apple", "amazon", "netflix",
                     "wikipedia", "stackoverflow", "reddit", "twitter"]
    
    for url in LEGIT_URLS:
        try:
            rows.append((url, 0))
        except Exception:
            pass

    for i in range(n_legit - len(LEGIT_URLS)):
        domain = legit_domains[i % len(legit_domains)]
        url = f"https://www.{domain}.com/page{i}/content"
        rows.append((url, 0))

    for url in PHISHING_URLS:
        rows.append((url, 2))

    phish_patterns = [
        "http://192.168.{a}.{b}/login",
        "http://{kw}-secure-{kw2}.tk/verify",
        "http://www.paypal.com@fake-domain.ml/login",
        "https://update-{kw}-account.xyz/{path}",
        "http://xn--{chars}.com/login",
    ]
    keywords = ["login", "verify", "secure", "bank", "account", "paypal"]
    for i in range(n_phishing - len(PHISHING_URLS)):
        kw = keywords[i % len(keywords)]
        url = f"http://{kw}-secure-update.tk/verify?id={i}&redirect=http://real.com"
        rows.append((url, 2))

    for url in SUSPICIOUS_URLS:
        rows.append((url, 1))

    for i in range(n_suspicious - len(SUSPICIOUS_URLS)):
        url = f"http://login-{i}.somebank.net/account/verify"
        rows.append((url, 1))

    return rows


def build_features(rows):
    X, y = [], []
    for url, label in rows:
        try:
            feat = extract_features(url)
            X.append(features_to_vector(feat))
            y.append(label)
        except Exception:
            pass
    return np.array(X), np.array(y)


def train(dataset_path=None):
    print("Building training data...")

    if dataset_path and Path(dataset_path).exists():
        df = pd.read_csv(dataset_path)
        rows = list(zip(df["url"].tolist(), df["label"].tolist()))
        print(f"Loaded {len(rows)} samples from {dataset_path}")
    else:
        rows = generate_synthetic_data()
        print(f"Generated {len(rows)} synthetic samples")

    X, y = build_features(rows)
    print(f"Features shape: {X.shape}")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    model = RandomForestClassifier(n_estimators=200, max_depth=20, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print(f"\nAccuracy: {accuracy_score(y_test, y_pred):.3f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["legitimate", "suspicious", "phishing"]))

    out_path = Path(__file__).parent / "model.pkl"
    joblib.dump(model, out_path)
    print(f"\nModel saved to {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=str, default=None, help="Path to phishing.csv")
    args = parser.parse_args()
    train(args.dataset)
