var nlp_toolkit = {

    sent_tokenize: function(text, backend) {
        if (typeof(backend) == 'undefined') {
            backend = 'compromise';
        }

        if (backend == 'compromise') {
            return this.sent_tokenize_by_compromise(text);
        }

        throw {
            name: 'Not found backend',
            message: "The backend is not valid."
        }
    },

    sent_tokenize_by_compromise: function(text) {
        // first, convert the raw text to a doc object
        var doc = nlp(text);

        // get all sentences and spans
        var sentences = [];
        // get all sentence trimed text
        var sentences_text = [];

        doc.sentences().forEach(function(d) {
            // get this sentence
            var sentence = d.text();

            // TODO fix the multiple same sentence bug
            var spans_start = text.indexOf(sentence);
            var spans_end = spans_start + sentence.length;

            // sometimes the sentence has right blanks
            // we need to remove it to avoid unexpected linebreaks
            sentence = sentence.trimRight();

            sentences.push({
                text: sentence, 
                spans: {
                    start: spans_start, 
                    end: spans_end
                }
            });
            sentences_text.push(sentence);
        });

        return { 
            sentences: sentences,
            sentences_text: sentences_text.join('\n')
        };
    },

    find_linech: function(pos, sentences) {
        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];
            if (pos>=sentence.spans.start &&
                pos<=sentence.spans.end) {
                return {
                    line: i, 
                    ch: pos-sentence.spans.start
                };
            }
        }
        return null;
    }
};