
<p align="center">
  <img src="https://github.com/Hrishikesh332/Video-To-Game/blob/main/backend/app/src/Thumbnail.png" alt="Video2Game Banner" width="100%">
</p>

<h1 align="center">Video2Game</h1>


**Video2Game** is an application which takes educational videos (like lectures, tutorials, or any type of the explainer videos) and transforms them into interactive games. Leveraging **TwelveLabs** for video understanding and **SambaNova** for code game generation, this project bridges passive video learning with immersive, game based experiences.


---

## ✨ Features

* 🎥 YouTube Video Processing
* 🧠 Pegasus Powered Video Content Analysis (TwelveLabs)
* 🕹️ Game Generation from Educational Video Content (via SambaNova - Deepseek)
* ⚙️ Modular Prompts for Analysis, Game Logic, and System Flow


---

## ⚙️ Environment Setup

Create a `.env` file in your root directory:

```bash
TWELVELABS_API_KEY=your_twelvelabs_api_key_here
SAMBANOVA_API_KEY=your_sambanova_api_key_here
BASE_URL=http://127.0.0.1:8000
SAMBANOVA_BASE_URL=your_sambanova_base_url_here
```

---

## 📦 Install Dependencies

```bash
pip install -r requirements.txt
```

---

## ▶️ Run the API

```bash
python app.py
```

The API will start on: [http://127.0.0.1:8000](http://127.0.0.1:8000)

---

## 🔌 API Endpoints

### ✅ Health Check

`GET /health`

```bash
curl http://127.0.0.1:8000/health
```

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

### Get All Indexes

`GET /indexes`

```bash
curl http://127.0.0.1:8000/indexes
```

---

### Get Videos from an Index

`GET /indexes/<index_id>/videos`

```bash
curl http://127.0.0.1:8000/indexes/<INDEX-ID>/videos
```

---

### Generate Game from Video

`POST /analyze`

```bash
curl -X POST http://127.0.0.1:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"video_id": "<VIDEO_ID>"}'
```

---

## Prompt Management

### Analysis Prompt

```bash
curl http://127.0.0.1:8000/prompts/analysis
```

### Game Generation Prompt

```bash
curl http://127.0.0.1:8000/prompts/game_generation
```

### System Prompt

```bash
curl http://127.0.0.1:8000/prompts/system
```

---

## Full Processing from YouTube URL

Convert a YouTube video directly into an interactive game:

### Process YouTube Video

```bash
curl -X POST http://127.0.0.1:8000/youtube/process \
  -H "Content-Type: application/json" \
  -d '{"youtube_url": "https://www.youtube.com/watch?v=abc"}'
```

### Regenerate Game from the Same URL

```bash
curl -X POST http://127.0.0.1:8000/youtube/process \
  -H "Content-Type: application/json" \
  -d '{"youtube_url": "https://www.youtube.com/watch?v=qxo8p8PtFeA", "regenerate": true}'
```

---

## Debug & Utilities

### List All Active Routes

```bash
curl -X GET http://127.0.0.1:8000/debug/routes
```

### Fetch Game HTML by Video Hash

```bash
curl -X GET http://127.0.0.1:8000/game/VIDEO_HASH/html
```

---


### Get all stored videos

```bash
curl -X GET http://127.0.0.1:8000/database/videos
```

### Find specific video by URL

```bash
curl -X POST http://127.0.0.1:8000/database/videos/search \
  -H "Content-Type: application/json" \
  -d '{
    "youtube_url": "https://www.youtube.com/watch?v=qxo8p8PtFeA"
  }'
```


## Queries

For any doubts or help you can reach out to me via hrishikesh3321@gmail.com or ask in the [Discord Channel](https://discord.com/invite/Sh6BRfakJa)


## Acknowledgements

* Powered by [TwelveLabs](https://www.twelvelabs.io)
* Enriched by [SambaNova](https://sambanova.ai)
