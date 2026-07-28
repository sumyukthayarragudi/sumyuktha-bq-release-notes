# BigQuery Pulse ⚡

> An intelligent, real-time release notes aggregator and social media composer for **Google Cloud BigQuery**.

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0+-000000?style=flat&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=flat&logo=github&logoColor=white)](https://github.com/sumyukthayarragudi/sumyuktha-bq-release-notes)

---

## 🌟 Overview

**BigQuery Pulse** automatically fetches, parses, categorizes, and formats official Google Cloud BigQuery release updates from the live Google Cloud RSS/Atom feed. It empowers data engineers, developers, and cloud architects to quickly stay updated with BigQuery features, security patches, and breaking changes—and share updates directly to Twitter/X.

---

## ✨ Features

- 🔄 **Live Feed Aggregation**: Syncs directly with Google Cloud's official BigQuery release notes Atom feed (`bigquery-release-notes.xml`).
- ⚡ **In-Memory Caching (5-Min TTL)**: High-performance backend caching prevents redundant HTTP requests while providing instant page loads.
- 🏷️ **Intelligent Categorization**: Automatically parses and tags updates into categories such as **Feature**, **Change**, **Issue/Fix**, **Security**, and **Announcement**.
- 🔍 **Instant Search & Filter**: Real-time client-side keyword search and one-click category filtering with live item counters.
- 🐤 **Tweet / X Update Composer**: 
  - Integrated tweet modal with custom formatting templates (*Standard*, *Short*, *Hashtags*).
  - Live 280-character limit counter with visual progress indicator.
  - Direct integration with Twitter Web Intent (`twitter.com/intent/tweet`).
- 🎨 **Modern Glassmorphism UI**: Built with dark mode aesthetics, smooth animations, skeleton loaders, and responsive layouts for desktop & mobile.

---

## 🏗️ Project Architecture & Directory Structure

```text
sumyuktha-bq-release-notes/
├── .gitignore               # Git ignore rules for Python, Node, OS, and IDE files
├── README.md                # Project documentation
└── bq-release-notes/        # Core application directory
    ├── app.py               # Flask backend server & XML feed parser
    ├── static/
    │   ├── css/
    │   │   └── style.css    # Design system, glassmorphism, & animations
    │   └── js/
    │       └── app.js       # Client-side SPA logic, state management, & modal handlers
    └── templates/
        └── index.html       # HTML5 single-page application structure
```

---

## 🚀 Quick Start Guide

### Prerequisites

- **Python 3.9+** installed on your system.

### 1. Clone the Repository

```bash
git clone https://github.com/sumyukthayarragudi/sumyuktha-bq-release-notes.git
cd sumyuktha-bq-release-notes
```

### 2. Set Up a Virtual Environment & Install Dependencies

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install required packages
pip install flask requests beautifulsoup4
```

### 3. Launch the Application

```bash
python bq-release-notes/app.py
```

Open your browser and navigate to:
👉 **`http://127.0.0.1:5000`**

---

## 🔌 API Documentation

### `GET /`
Renders the single-page web interface.

### `GET /api/notes`
Returns parsed BigQuery release notes in JSON format.

#### Query Parameters:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `refresh` | `boolean` | `false` | Pass `true` to force a cache refresh from Google's feed. |

#### Sample Response:
```json
{
  "status": "success",
  "fetched_at": "2026-07-28 20:30:00 UTC",
  "count": 18,
  "categories": ["Change", "Feature", "General", "Issue"],
  "notes": [
    {
      "id": "bq-note-1",
      "date": "July 25, 2026",
      "updated_iso": "2026-07-25T00:00:00Z",
      "category": "Feature",
      "content_html": "<p>BigQuery now supports enhanced vector search indexes...</p>",
      "content_text": "BigQuery now supports enhanced vector search indexes...",
      "link": "https://docs.cloud.google.com/bigquery/docs/release-notes"
    }
  ]
}
```

---

## 🛠️ Technology Stack

- **Backend**: Python 3, Flask, Requests, BeautifulSoup4, `xml.etree.ElementTree`
- **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS3 (Flexbox/Grid, CSS Variables, Glassmorphism)
- **Deployment & Version Control**: Git, GitHub, GitHub CLI

---

## 👤 Author

Developed by **[sumyukthayarragudi](https://github.com/sumyukthayarragudi)**
