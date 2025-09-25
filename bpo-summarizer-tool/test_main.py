import unittest
import main

class TestSummarizer(unittest.TestCase):
    def test_summarization(self):
        ticket = "This is a long ticket description that needs to be summarized. It contains a lot of information about the issue, including details about the customer, the problem, and the steps taken to resolve it."
        summary = main.summarize_ticket(ticket)
        self.assertTrue(len(summary) <= 100)
        self.assertTrue("..." in summary)

if __name__ == '__main__':
    unittest.main()
