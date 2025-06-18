

### 1. Environment Setup
Create a `.env` file in your project directory
```bash
TWELVELABS_API_KEY=your_twelvelabs_api_key_here
SAMBANOVA_API_KEY=your_sambanova_api_key_here
BASE_URL= localhost or deployed link
SAMBANOVA_BASE_URL= sambonva_base_url
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Start the API
```bash
python app.py
```

The API will start on `http://localhost:5000`

---

## API Endpoints 

### **Health Check**

**Endpoint -** `GET /health`

**Command**
```bash
curl http://localhost:5000/health
```

**Response**
```json
{
  "status": "healthy",
  "services": {
    "twelvelabs": "connected",
    "sambanova": "connected"
  }
}
```

---

### **Get All Indexes**

**Endpoint -** `GET /indexes`

**Command**
```bash
curl http://localhost:5000/indexes
```


---

### **Get Videos from Index**

**Endpoint - ** `GET /indexes/<index_id>/videos`

**Command**
```bash
curl http://localhost:5000/indexes/<INDEX-ID>/videos
```

---

### **Generate Game**

**Endpoint - ** `POST /analyze`


**Command**
```bash
curl -X POST http://localhost:5000/analyze -H "Content-Type: application/json" -d '{"video_id": "<VIDEO_ID>"}'
```


---


# Analysis prompt
curl http://localhost:5000/prompts/analysis

# Game generation prompt  
curl http://localhost:5000/prompts/game_generation

# System prompt
curl http://localhost:5000/prompts/system

# Crucial Endpoint (Youtube URL)

Youtube URL -> Downloading -> Indexing -> Pegasus (Analysis Generation) -> DeepSeek (SambaNova) -> HTML Response

curl -X POST http://127.0.0.1:8000/youtube/process \
  -H "Content-Type: application/json" \
  -d '{"youtube_url": "https://www.youtube.com/watch?v=abc"}'


# Crucial Endpoint (Youtube URL with Regenerate)

  curl -X POST http://127.0.0.1:8000/youtube/process \
  -H "Content-Type: application/json" \
  -d '{"youtube_url": "https://www.youtube.com/watch?v=qxo8p8PtFeA", "regenerate": true}'


# Debug to find the working routes

  curl -X GET http://127.0.0.1:8000/debug/routes

# Game HASH

  curl -X GET http://127.0.0.1:8000/game/VIDEO_HASH/html