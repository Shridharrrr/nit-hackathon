from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth
import firebase_admin
from firebase_admin import credentials
import os

# Initialize Firebase Admin SDK
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

app = FastAPI(
    title="Fake News Detector",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])

# Import and include news router
from app.routes import news
app.include_router(news.router, prefix="/api/news", tags=["news"])

@app.get("/")
async def root():
    return {"message": "Fake News Detector API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)