# Dataset

Place your phishing URL dataset CSV here as `phishing.csv`.

## Required Format

| Column | Description |
|--------|-------------|
| `url`  | The full URL string |
| `label`| `0` = legitimate, `1` = suspicious, `2` = phishing |

## Recommended Sources

- [Kaggle - Phishing URL Dataset](https://www.kaggle.com/datasets/taruntiwarihp/phishing-site-urls)
- [UCI ML Repository - Phishing Websites](https://archive.ics.uci.edu/ml/datasets/phishing+websites)
- [PhishTank](https://www.phishtank.com/developer_info.php) — real-time phishing URLs

## Training the Model

```bash
cd backend
python train_model.py --dataset ../dataset/phishing.csv
```

Without a CSV, the trainer generates a synthetic dataset automatically.
