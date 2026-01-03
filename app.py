from flask import Flask, render_template, jsonify, send_from_directory
import json
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/images/<path:filename>')
def serve_image(filename):
    # The JSON has paths like "output_final\\images\\Name.jpg"
    # We want to serve from "data/images/"
    # So we just need the filename part if the request comes in clean,
    # or we handle the full path if the frontend sends it.
    # Let's assume the frontend cleans it up to just the filename.
    return send_from_directory(os.path.join('data', 'images'), filename)

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