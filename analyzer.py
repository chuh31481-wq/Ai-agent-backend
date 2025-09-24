def analyze_text(text):
    char_count = len(text)
    word_count = len(text.split())
    sentence_count = len([s.strip() for s in text.split('.') if s.strip()])
    return {
        'char_count': char_count,
        'word_count': word_count,
        'sentence_count': sentence_count
    }