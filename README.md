
<p align="center">
  <img src="https://github.com/Hrishikesh332/Video-To-Game/blob/main/backend/app/src/downloads/Thumbnail.png" alt="Video2Game Banner" width="100%">
</p>

<h1 align="center">Video2Game</h1>


**Video2Game** is an application which takes educational videos or Learning associated (like lectures, tutorials, or any type of the explainer videos) and transforms them into interactive games. Leveraging **TwelveLabs** for video understanding and **SambaNova** for code game generation, this project bridges passive video learning with immersive, game based experiences.


---

## ✨ Features

* 🎥 YouTube Video Processing
* 🧠 Pegasus Powered Video Content Analysis (TwelveLabs)
* 🕹️ Game Generation from Educational Video Content (via SambaNova - Deepseek)
* ⚙️ Modular Prompts for Analysis, Game Logic, and System Flow


---

## Architecture

### Approach 1

#### To Generate the Interactive Learning App with the TwelveLabs and Sambanova


![Architecture 1](https://github.com/Hrishikesh332/Video2Game/blob/main/backend/app/src/architecture_1.png)

### Approach 2

### To Generate the Interactive App with the already Indexed App


![Architecture 2](https://github.com/Hrishikesh332/Video2Game/blob/main/backend/app/src/architecture_2.png)

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
## 🛠 Tech Stack

* **Frontend** – Next.js
* **Backend** – Python (Flask)
* **AI Services** – [TwelveLabs API](https://docs.twelvelabs.io/) (Marengo & Pegasus)
* **Vector DB** – [Weaviate](https://weaviate.io/)

---



## ⚙️ Local Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/Hrishikesh332/Twelve-Labs-Nature-Footage.git
   cd Video-To-Game
   ```

2. **For Frontend**

   ```bash
   cd www.video2game.vercel.app
   ```

3. **Setup dependencies**

   ```bash
   npm install --legacy-peer-deps
   ```

4. **Create .env file**
.env.example
   ```bash
   NEXT_PUBLIC_APP_URL="http://127.0.0.1:8000" or deployed link (Running the backend server is mandatory for usage)
   ```

5. **Do run the app with**

   ```bash
   npm run dev
   ```


6. **Live At**

  `http://localhost:3000`



7. **For Backend**

Do checkout the README.md inside the `backend/` for the setup by - (With new terminal from root directory)
   ```bash
   cd backend
   ```


---

## Queries

For any doubts or help you can reach out to me via hrishikesh3321@gmail.com or ask in the [Discord Channel](https://discord.com/invite/Sh6BRfakJa)


## Acknowledgements

* Powered by [TwelveLabs](https://www.twelvelabs.io)
* Enriched by [SambaNova](https://sambanova.ai)
