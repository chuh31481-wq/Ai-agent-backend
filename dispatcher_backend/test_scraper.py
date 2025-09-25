import unittest
import requests
from bs4 import BeautifulSoup

class TestScraper(unittest.TestCase):
    def test_successful_request(self):
        response = requests.get("https://www.example.com")
        self.assertEqual(response.status_code, 200)

    def test_beautifulsoup_parsing(self):
        html = """<!DOCTYPE html><html><head><title>Example</title></head><body><h1>Example</h1></body></html>"""
        soup = BeautifulSoup(html, 'html.parser')
        self.assertEqual(soup.title.text, "Example")

if __name__ == '__main__':
    unittest.main()