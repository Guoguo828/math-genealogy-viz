# Math Genealogy Visualization Project

This project is a web application that visualizes the genealogy of mathematicians using data scraped from the Mathematics Genealogy Project website. It allows users to explore the relationships between mathematicians, including their advisors and students.

## Project Structure

```
math-genealogy-viz
├── app.py                # Entry point of the application, sets up the Flask web server
├── scraper.py            # Contains the web scraping logic to fetch genealogy data
├── static
│   ├── css
│   │   └── style.css     # CSS styles for the web application
│   └── js
│       └── main.js       # JavaScript for handling user interactions
├── templates
│   └── index.html        # HTML template for rendering the genealogy visualization
├── data
│   └── genealogy_data.json # JSON file storing the scraped genealogy data
├── requirements.txt      # List of required Python packages
└── README.md             # Documentation for the project
```

## Features

- **Data Scraping**: Automatically fetches data from the Mathematics Genealogy Project.
- **Interactive Visualization**: Users can click on mathematicians' names to view their genealogy tree.
- **Responsive Design**: The web interface is designed to be user-friendly and visually appealing.

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd math-genealogy-viz
   ```

2. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

3. Run the application:
   ```
   python app.py
   ```

4. Open your web browser and go to `http://127.0.0.1:5000` to view the application.

## Usage

- Upon loading the application, you will see a visualization of the mathematicians' genealogy.
- Click on any mathematician's name to focus on their specific genealogy tree.
- Use the navigation features to explore different branches of the genealogy.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.