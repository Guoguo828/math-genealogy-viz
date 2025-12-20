import requests
from bs4 import BeautifulSoup
import json
import time
from collections import deque
import re

class MathGenealogyScraper:
    def __init__(self, start_id, max_count=100):
        self.base_url = "https://www.mathgenealogy.org/id.php?id="
        self.start_id = start_id
        self.max_count = max_count
        self.visited = set()
        self.people_data = {}

    def get_soup(self, url):
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                return BeautifulSoup(response.text, 'html.parser')
        except Exception as e:
            print(f"Error fetching {url}: {e}")
        return None

    def parse_scholar(self, scholar_id):
        url = self.base_url + str(scholar_id)
        soup = self.get_soup(url)
        
        if not soup:
            return None

        main_content = soup.find('div', id='mainContent')
        if not main_content:
            main_content = soup

        # 1. Name
        name = "Unknown"
        name_tag = main_content.find('h2')
        if name_tag:
            name = name_tag.get_text(strip=True)

        # 2. Dissertation
        dissertation = None
        thesis_tag = main_content.find('span', id='thesisTitle')
        if thesis_tag:
            dissertation = thesis_tag.get_text(strip=True)

        # 3. School and Year
        school = None
        year = None
        
        # Find the span that usually contains the school name (green color)
        school_tag = main_content.find('span', style=lambda x: x and '#006633' in x)
        if school_tag:
            school = school_tag.get_text(strip=True)
            
            # The year is usually in the parent element's text
            if school_tag.parent:
                full_text = school_tag.parent.get_text()
                # Search for a 4-digit year
                year_match = re.search(r'\b(1\d{3}|20\d{2})\b', full_text)
                if year_match:
                    year = int(year_match.group(1))

        advisors = []
        advisor_text_node = main_content.find(string=re.compile("Advisor"))
        
        if advisor_text_node:
            parent_p = advisor_text_node.parent
            
            for link in parent_p.find_all('a'):
                href = link.get('href')
                if href and 'id.php?id=' in href:
                    try:
                        adv_id = href.split('id=')[1].split('&')[0]
                        adv_name = link.get_text(strip=True)
                        
                        if adv_id.isdigit():
                            advisors.append({'id': adv_id, 'name': adv_name})
                    except IndexError:
                        continue

        return {
            'id': scholar_id,
            'name': name,
            'school': school,
            'year': year,
            'dissertation': dissertation,
            'advisors': advisors
        }

    def build_tree(self):
        queue = deque([self.start_id])
        count = 0

        print(f"🚀 开始爬取，目标上限: {self.max_count} 人")

        while queue and count < self.max_count:
            current_id = queue.popleft()
            
            if current_id in self.visited:
                continue

            # 打印进度，end="" 让后续的成功/失败信息接在同一行
            print(f"[{count + 1}/{self.max_count}] 正在处理 ID: {current_id} ...", end="", flush=True)

            data = self.parse_scholar(current_id)
            if not data:
                print(" ❌ 失败 (页面无效或网络错误)")
                continue

            self.visited.add(current_id)
            self.people_data[current_id] = data
            count += 1

            # 打印成功信息和发现的导师数量
            advisor_count = len(data['advisors'])
            print(f" ✅ {data['name']} (新发现导师: {advisor_count} 人)")
            
            for advisor in data['advisors']:
                adv_id = advisor['id']
                if adv_id not in self.visited and adv_id not in queue:
                    queue.append(adv_id)

            time.sleep(0.5)
        
        print(f"\n🎉 爬取完成! 共收集 {len(self.people_data)} 位科学家信息。")

    def save_data(self, filename='data/genealogy_data.json'):
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.people_data, f, ensure_ascii=False, indent=4)

if __name__ == "__main__":
    start_scholar_id = "121329"
    scraper = MathGenealogyScraper(start_scholar_id, max_count=20)
    scraper.build_tree()
    scraper.save_data()