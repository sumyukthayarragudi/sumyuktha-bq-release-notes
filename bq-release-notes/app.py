import os
import re
import time
import xml.etree.ElementTree as ET
from urllib.parse import quote
import requests
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache to prevent hitting feed too frequently on every page load
CACHE_DATA = None
CACHE_TIMESTAMP = 0
CACHE_TTL = 300  # 5 minutes default cache


def parse_feed_xml(xml_content):
    root = ET.fromstring(xml_content)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}

    entries = []
    item_counter = 0
    categories_found = set()

    for entry in root.findall('atom:entry', ns):
        entry_title = entry.find('atom:title', ns)
        date_str = entry_title.text.strip() if entry_title is not None else "Unknown Date"

        updated_el = entry.find('atom:updated', ns)
        updated_iso = updated_el.text.strip() if updated_el is not None else date_str

        link_el = entry.find("atom:link[@rel='alternate']", ns)
        if link_el is None:
            link_el = entry.find("atom:link", ns)
        link_url = link_el.attrib.get("href", "") if link_el is not None else ""

        content_el = entry.find('atom:content', ns)
        content_html = content_el.text if content_el is not None and content_el.text else ""

        soup = BeautifulSoup(content_html, 'html.parser')
        
        # Ensure external links inside content open in new tabs securely
        for a in soup.find_all('a', href=True):
            a['target'] = '_blank'
            a['rel'] = 'noopener noreferrer'
            if a['href'].startswith('/'):
                a['href'] = f"https://docs.cloud.google.com{a['href']}"

        h3_tags = soup.find_all('h3')

        if h3_tags:
            for h3 in h3_tags:
                category = h3.get_text(strip=True)
                categories_found.add(category)

                sibling_html = []
                curr = h3.next_sibling
                while curr and curr.name != 'h3':
                    if hasattr(curr, 'decode'):
                        sibling_html.append(str(curr))
                    elif isinstance(curr, str):
                        sibling_html.append(curr)
                    curr = curr.next_sibling

                raw_html = "".join(sibling_html).strip()
                soup_item = BeautifulSoup(raw_html, 'html.parser')
                
                # Make sure links inside sibling_html also open in new tab
                for a in soup_item.find_all('a', href=True):
                    a['target'] = '_blank'
                    a['rel'] = 'noopener noreferrer'
                    if a['href'].startswith('/'):
                        a['href'] = f"https://docs.cloud.google.com{a['href']}"
                
                processed_html = str(soup_item)
                plain_text = soup_item.get_text(separator=" ", strip=True)
                plain_text = re.sub(r'\s+', ' ', plain_text)

                item_counter += 1
                entries.append({
                    "id": f"bq-note-{item_counter}",
                    "date": date_str,
                    "updated_iso": updated_iso,
                    "category": category,
                    "content_html": processed_html,
                    "content_text": plain_text,
                    "link": link_url
                })
        else:
            category = "General"
            categories_found.add(category)
            plain_text = soup.get_text(separator=" ", strip=True)
            plain_text = re.sub(r'\s+', ' ', plain_text)
            
            item_counter += 1
            entries.append({
                "id": f"bq-note-{item_counter}",
                "date": date_str,
                "updated_iso": updated_iso,
                "category": category,
                "content_html": str(soup),
                "content_text": plain_text,
                "link": link_url
            })

    return entries, sorted(list(categories_found))


def fetch_release_notes(force_refresh=False):
    global CACHE_DATA, CACHE_TIMESTAMP
    now = time.time()

    if not force_refresh and CACHE_DATA is not None and (now - CACHE_TIMESTAMP < CACHE_TTL):
        return CACHE_DATA

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache'
    }

    try:
        resp = requests.get(FEED_URL, headers=headers, timeout=12)
        resp.raise_for_status()

        notes, categories = parse_feed_xml(resp.content)
        
        CACHE_DATA = {
            "status": "success",
            "fetched_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "count": len(notes),
            "categories": categories,
            "notes": notes
        }
        CACHE_TIMESTAMP = now
        return CACHE_DATA
    except Exception as e:
        if CACHE_DATA:
            stale_copy = dict(CACHE_DATA)
            stale_copy["warning"] = f"Failed to refresh ({str(e)}). Displaying cached data."
            return stale_copy
        return {
            "status": "error",
            "message": str(e),
            "fetched_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "count": 0,
            "categories": [],
            "notes": []
        }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/notes")
def get_notes():
    force = request.args.get("refresh", "false").lower() == "true"
    data = fetch_release_notes(force_refresh=force)
    return jsonify(data)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
