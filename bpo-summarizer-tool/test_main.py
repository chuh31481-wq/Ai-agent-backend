import unittest
import main

class TestSummarizer(unittest.TestCase):
    def test_summarize_ticket(self):
        self.assertEqual(main.summarize_ticket("This is a sample ticket."), "Summary of ticket: This is a sample ticket.")

if __name__ == '__main__':
    unittest.main()
