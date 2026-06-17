# HydroTech Flood Detection

This repository contains a premium AI-powered flood detection platform built with:

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, Three.js, Framer Motion, GSAP
- **Backend:** FastAPI, PyTorch, U-Net++, OpenCV
- **AI Model:** `best_model.pth` (U-Net++ EfficientNet-B3)

## Folder structure

- `backend/` — FastAPI service, model loading, prediction, PDF report generation
- `frontend/` — Next.js app with a cinematic landing page and enterprise dashboard

## Local setup

1. Install backend dependencies:

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

2. Install frontend dependencies:

```bash
cd frontend
npm install
```

3. Run the backend:

```bash
cd backend
.\.venv\Scripts\python.exe main.py
```

4. Run the frontend:

```bash
cd frontend
npm run dev
```

5. Open the app:

- Frontend: `http://localhost:3000`
- Backend: `http://127.0.0.1:8000`

## Deployment

- Build frontend:

```bash
cd frontend
npm run build
npm start
```

- Serve backend with uvicorn:

```bash
cd backend
.\.venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 8000
```

## Notes

- Ensure `best_model.pth` is present in the repository root.
- The frontend calls `http://127.0.0.1:8000/predict` and `http://127.0.0.1:8000/report`.
- The app is designed as a high-end premium product with cinematic presentation and enterprise UI.
