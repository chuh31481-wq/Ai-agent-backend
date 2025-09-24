from analyzer import analyze_text

sample_text = "Hello world. This is a test."
result = analyze_text(sample_text)

if result['char_count'] == 31 and result['word_count'] == 6 and result['sentence_count'] == 2:
    print("All tests passed!")
else:
    print(f"Test failed: Character count: {result['char_count']}, Word count: {result['word_count']}, Sentence count: {result['sentence_count']}")