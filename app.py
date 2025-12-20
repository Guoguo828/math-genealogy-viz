from flask import Flask, render_template, jsonify
import json
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/data')
def get_data():
    file_path = os.path.join('data', 'genealogy_data.json')
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            genealogy_data = json.load(f)
        return jsonify(genealogy_data)
    else:
        return jsonify({})

if __name__ == '__main__':
    app.run(debug=True)