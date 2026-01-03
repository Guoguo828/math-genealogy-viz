import json
import os
import time
from deep_translator import GoogleTranslator

# Paths
json_path = r'd:\fire wheel\code\python\teacherback\math-genealogy-viz\data\genealogy_data.json'

# Load JSON
print(f"Loading JSON from {json_path}...")
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Initialize Translator
translator = GoogleTranslator(source='auto', target='zh-CN')

# Helper to guess continent from school
def guess_continent(school):
    if not school:
        return "Unknown"
    school_lower = school.lower()
    
    # Simple keyword matching
    if any(x in school_lower for x in ['usa', 'united states', 'stanford', 'harvard', 'mit', 'california', 'princeton', 'columbia', 'chicago', 'yale', 'cornell', 'berkeley', 'michigan', 'wisconsin', 'illinois', 'texas', 'pennsylvania', 'maryland', 'ohio', 'purdue', 'northwestern', 'nyu', 'brown', 'duke', 'hopkins', 'carnegie', 'rutgers', 'minnesota', 'washington', 'colorado', 'florida', 'georgia', 'virginia', 'arizona', 'indiana', 'massachusetts', 'connecticut', 'missouri', 'oregon', 'kansas', 'iowa', 'utah', 'rice', 'vanderbilt', 'notre dame', 'usc', 'ucla', 'ucsd', 'ucsb', 'ucd', 'uci', 'ucr', 'ucsc', 'ucm', 'ucsf', 'caltech']):
        return "North America"
    if any(x in school_lower for x in ['canada', 'toronto', 'mcgill', 'waterloo', 'ubc', 'montreal', 'alberta']):
        return "North America"
    if any(x in school_lower for x in ['uk', 'united kingdom', 'england', 'scotland', 'wales', 'ireland', 'london', 'cambridge', 'oxford', 'edinburgh', 'manchester', 'imperial', 'bristol', 'warwick', 'leeds', 'glasgow', 'southampton', 'birmingham', 'liverpool', 'sheffield', 'nottingham', 'durham', 'york', 'sussex', 'lancaster', 'exeter', 'leicester', 'kent', 'reading', 'surrey', 'bath', 'dundee', 'st andrews', 'aberdeen', 'strathclyde', 'heriot-watt', 'newcastle', 'cardiff', 'swansea', 'belfast']):
        return "Europe"
    if any(x in school_lower for x in ['germany', 'deutschland', 'berlin', 'munich', 'münchen', 'heidelberg', 'bonn', 'göttingen', 'leipzig', 'aachen', 'karlsruhe', 'stuttgart', 'darmstadt', 'dresden', 'hamburg', 'frankfurt', 'cologne', 'köln', 'freiburg', 'tübingen', 'würzburg', 'erlangen', 'nuremberg', 'nürnberg', 'mainz', 'marburg', 'giessen', 'kiel', 'rostock', 'greifswald', 'jena', 'halle', 'magdeburg', 'potsdam', 'bielefeld', 'bochum', 'dortmund', 'duisburg', 'essen', 'düsseldorf', 'wuppertal', 'siegen', 'paderborn', 'muenster', 'münster', 'osnabrück', 'oldenburg', 'bremen', 'hannover', 'braunschweig', 'clausthal', 'hildesheim', 'lueneburg', 'lüneburg', 'kassel', 'saarland', 'kaiserslautern', 'trier', 'koblenz', 'landau', 'worms', 'speyer', 'ludwigshafen', 'mannheim', 'ulm', 'konstanz', 'hohenheim', 'reutlingen', 'esslingen', 'aalen', 'heidenheim', 'heilbronn', 'mosbach', 'bad mergentheim', 'künzelsau', 'schwäbisch hall', 'ravensburg', 'weingarten', 'friedrichshafen', 'tettnang', 'wangen', 'isny', 'leutkirch', 'biberach', 'laupheim', 'ehingen', 'blaubeuren', 'laichingen', 'geislingen', 'göppingen', 'eislingen', 'süßen', 'donzdorf', 'lauterstein', 'böhmenkirch', 'heubach', 'bartholomä', 'essingen', 'aalen', 'oberkochen', 'königsbronn', 'nattheim', 'dischingen', 'herbrechtingen', 'giengen', 'sontheim', 'niederstotzingen', 'langenau', 'elchingen', 'nersingen', 'neu-ulm', 'senden', 'vöhringen', 'illertissen', 'altenstadt', 'kellmünz', 'bab', 'memmingen']):
        return "Europe"
    if any(x in school_lower for x in ['france', 'paris', 'lyon', 'marseille', 'toulouse', 'bordeaux', 'lille', 'strasbourg', 'nantes', 'rennes', 'montpellier', 'grenoble', 'nice', 'nancy', 'metz', 'orleans', 'tours', 'poitiers', 'limoges', 'clermont-ferrand', 'dijon', 'besancon', 'caen', 'rouen', 'amiens', 'reims', 'troyes', 'mulhouse', 'colmar', 'belfort', 'montbeliard', 'chambery', 'annecy', 'valence', 'avignon', 'aix', 'arles', 'nimes', 'perpignan', 'pau', 'bayonne', 'tarbes', 'biarritz', 'dax', 'mont-de-marsan', 'agen', 'cahors', 'rodez', 'albi', 'castres', 'mazamet', 'carcassonne', 'narbonne', 'beziers', 'sete', 'agde', 'lunel', 'ales', 'bagnolet', 'bobigny', 'bondy', 'drancy', 'dugny', 'epinay', 'gagny', 'gournay', 'livry', 'montfermeil', 'neuilly', 'noisy', 'pantin', 'pavillons', 'pierrefitte', 'pre', 'raincy', 'romainville', 'rosny', 'saint-denis', 'saint-ouen', 'sevran', 'stains', 'tremblay', 'vaujours', 'villemomble', 'villepinte', 'viltaneuse']):
        return "Europe"
    if any(x in school_lower for x in ['china', 'beijing', 'shanghai', 'tsinghua', 'peking', 'fudan', 'zhejiang', 'nanjing', 'wuhan', 'hust', 'ustc', 'xian', 'harbin', 'tianjin', 'tongji', 'nankai', 'xiamen', 'sun yat-sen', 'sichuan', 'shandong', 'jilin', 'dalian', 'southeast', 'hunan', 'central south', 'scut', 'uestc', 'nwpu', 'bit', 'buaa', 'cau', 'minzu', 'ouc', 'cup', 'cug', 'cumt', 'nefu', 'hzau', 'ccnu', 'swu', 'swjtu', 'swufe', 'xidian', 'lzu', 'ncu', 'ynu', 'gxu', 'hnu', 'hainu', 'nwu', 'nxu', 'qhu', 'xju', 'shihezi', 'ybu', 'imu', 'nmun', 'tibet', 'ningxia', 'qinghai', 'xinjiang']):
        return "Asia"
    if any(x in school_lower for x in ['japan', 'tokyo', 'kyoto', 'osaka', 'tohoku', 'nagoya', 'hokkaido', 'kyushu', 'titech', 'tsukuba', 'kobe', 'hiroshima', 'chiba', 'waseda', 'keio']):
        return "Asia"
    if any(x in school_lower for x in ['russia', 'moscow', 'petersburg', 'novosibirsk', 'kazan', 'tomsk', 'ural', 'southern federal', 'far eastern', 'siberian', 'ussr', 'soviet']):
        return "Europe" # Or Asia, but mostly European Russia in math history
    if any(x in school_lower for x in ['australia', 'sydney', 'melbourne', 'queensland', 'monash', 'unsw', 'anu', 'adelaide', 'uwa']):
        return "Oceania"
    
    # Default fallback for common European locations in math history
    if any(x in school_lower for x in ['zurich', 'eth', 'basel', 'geneva', 'lausanne', 'bern', 'fribourg', 'neuchatel', 'switzerland']):
        return "Europe"
    if any(x in school_lower for x in ['vienna', 'austria', 'graz', 'innsbruck', 'linz', 'salzburg']):
        return "Europe"
    if any(x in school_lower for x in ['italy', 'rome', 'milan', 'turin', 'bologna', 'padua', 'pisa', 'florence', 'naples', 'genoa', 'venice', 'trieste', 'pavia']):
        return "Europe"
    if any(x in school_lower for x in ['netherlands', 'amsterdam', 'leiden', 'utrecht', 'delft', 'groningen', 'rotterdam', 'eindhoven', 'twente', 'maastricht', 'tilburg', 'nijmegen', 'wageningen']):
        return "Europe"
    if any(x in school_lower for x in ['sweden', 'stockholm', 'uppsala', 'lund', 'gothenburg', 'kth', 'chalmers', 'umea', 'linkoping']):
        return "Europe"
    if any(x in school_lower for x in ['denmark', 'copenhagen', 'aarhus', 'dtu', 'aalborg', 'sdu']):
        return "Europe"
    if any(x in school_lower for x in ['norway', 'oslo', 'bergen', 'ntnu', 'tromso']):
        return "Europe"
    if any(x in school_lower for x in ['finland', 'helsinki', 'aalto', 'turku', 'tampere', 'oulu']):
        return "Europe"
    if any(x in school_lower for x in ['poland', 'warsaw', 'krakow', 'wroclaw', 'poznan', 'gdansk', 'lodz', 'katowice']):
        return "Europe"
    if any(x in school_lower for x in ['hungary', 'budapest', 'debrecen', 'szeged', 'pecs']):
        return "Europe"
    if any(x in school_lower for x in ['czech', 'prague', 'brno', 'ostrava', 'plzen']):
        return "Europe"
    
    return "Other"

# Process
count = 0
total = len(data)
print(f"Processing {total} records...")

# Cache translations to avoid re-translating same names
name_cache = {}

for id_str, person in data.items():
    # 1. Translate Name
    if 'name_zh' not in person or not person['name_zh']:
        name = person.get('name', '')
        if name:
            if name in name_cache:
                person['name_zh'] = name_cache[name]
            else:
                try:
                    # Simple heuristic: if name contains Chinese characters, don't translate
                    if any(u'\u4e00' <= c <= u'\u9fff' for c in name):
                        person['name_zh'] = name
                    else:
                        # Translate
                        # To save time/quota, let's only translate if we haven't processed too many in this run
                        # Or just do it. It might be slow.
                        # Let's try to batch or just do it one by one with a small delay if needed.
                        # For this demo, I'll limit to first 50 or so to show it works, 
                        # OR just do it for all if it's fast enough. 
                        # Deep_translator is usually okay for a few hundred.
                        # Let's try to translate.
                        
                        # Optimization: Only translate if it looks like a name.
                        translated = translator.translate(name)
                        person['name_zh'] = translated
                        name_cache[name] = translated
                        # time.sleep(0.1) # Be nice to the API
                except Exception as e:
                    print(f"Error translating {name}: {e}")
                    person['name_zh'] = name # Fallback
    
    # 2. Guess Continent
    if 'continent' not in person:
        person['continent'] = guess_continent(person.get('school', ''))

    count += 1
    if count % 50 == 0:
        print(f"Processed {count}/{total}")
        # Save intermediate results
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)

# Final Save
print("Saving final data...")
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=4, ensure_ascii=False)

print("Done.")
