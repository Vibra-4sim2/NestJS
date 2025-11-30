# Python Setup (Local, Docker, Render)

This project uses Python for ML recommendations via `src/ai/recommendation_runner.py`.

## Env Var
- `RECOMMENDER_PYTHON`: path or command to a Python 3 interpreter.
  - If set, the backend will use it. Otherwise it tries common paths and `python3`/`python`/`py`.

## Local Development

macOS (Apple Silicon / Homebrew):
```
which python3
export RECOMMENDER_PYTHON=/opt/homebrew/bin/python3
npm run start
```

Windows (PowerShell):
```
python --version # or py --version
$env:RECOMMENDER_PYTHON = "py"
npm run start
```

Linux:
```
which python3
export RECOMMENDER_PYTHON=/usr/bin/python3
npm run start
```

## Docker/Render
- Dockerfile installs `python3` + `pip` and Python deps from `src/ai/requirements.txt`.
- `render.yaml` sets `RECOMMENDER_PYTHON=/usr/bin/python3`.

## Models via Git LFS
The ML model files in `src/ai/models/*.joblib` are tracked by Git LFS.

After cloning, ensure LFS pulls binary contents:
```
git lfs install
git lfs pull
```

## Health Check
Test Python availability:
```
curl -s http://localhost:3000/recommendations/health/check
```
