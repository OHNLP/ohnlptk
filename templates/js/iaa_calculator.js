var iaa_calculator = {

    evaluate_ann_on_dtd: function(dtd, ann_a, ann_b, match_mode) {
        if (typeof(match_mode)=='undefined') {
            match_mode = 'overlap';
        }

        // check the text first
        if (ann_a.text != ann_b.text) {
            throw { 
                name: 'Different texts', 
                message: 'The texts are different in given annotations.'
            };
        }

        // check each etag
        var cm_ann = { tp: 0, fp: 0, fn: 0 };
        for (let i = 0; i < dtd.etags.length; i++) {
            const tag_def = dtd.etags[i];
            var r = this.evaluate_ann_on_tag(tag_def, ann_a, ann_b, match_mode);

            // add the result of this tag
            cm_ann.tp += r.cm.tp;
            cm_ann.fp += r.cm.fp;
            cm_ann.fn += r.cm.fn;
        }
        var result = this.calc_p_r_f1(cm_ann);

        return result;
    },

    evaluate_ann_on_tag: function(tag_def, ann_a, ann_b, match_mode) {
        if (typeof(match_mode)=='undefined') {
            match_mode = 'overlap';
        }

        // check the text first
        if (ann_a.text != ann_b.text) {
            throw { 
                name: 'Different texts', 
                message: 'The texts are different in given annotations.'
            };
        }

        // get all spans of this tag
        var spans_list_a = this.get_spans_list_by_tag(tag_def, ann_a);
        var spans_list_b = this.get_spans_list_by_tag(tag_def, ann_b);

        var cm = this.calc_matching(spans_list_a, spans_list_b);
        var result = this.calc_p_r_f1(cm);

        return result;
    },

    calc_matching: function(spans_list_a, spans_list_b, match_mode) {
        if (typeof(match_mode)=='undefined') {
            match_mode = 'overlap';
        }
        var tp = 0;
        var fp = 0;
        var fn = 0;

        for (let i = 0; i < spans_list_a.length; i++) {
            var spans_a = spans_list_a[i];
            
            var is_match = this.is_spans_in_list(
                spans_a, 
                spans_list_b, 
                match_mode
            );

            if (is_match) {
                tp += 1;
            } else {
                fp += 1;
            }
        }

        fn = spans_list_b.length - tp;

        return {tp:tp, fp:fp, fn:fn};
    },

    calc_p_r_f1: function(cm) {
        var precision = cm.tp / (cm.tp + cm.fp);
        var recall = cm.tp / (cm.tp + cm.fn);
        var f1 = 2 * precision * recall / (precision + recall);

        return {
            precision: precision,
            recall: recall,
            f1: f1,
            cm: cm
        }
    },

    is_spans_in_list: function(spans, spans_list, match_mode) {
        if (typeof(match_mode)=='undefined') {
            match_mode = 'overlap';
        }
        var loc_a = this.spans2loc(spans);
        for (let i = 0; i < spans_list.length; i++) {
            var spans_b = spans_list[i];
            if (match_mode == 'overlap') {
                // for overlap mode, check ranges of two spans
                var loc_b = this.spans2loc(spans_b);
                if (this.is_overlapped(loc_a, loc_b)) {
                    return true;
                }
            } else if (match_mode == 'exact') {

                if (spans == spans_b) {
                    return true;
                }
            }
        }
        return false;
    },

    spans2loc: function(spans) {
        var vs = spans.split('~');
        return [vs[0], vs[1]];
    },

    is_overlapped: function(loc_a, loc_b) {
        if (loc_a[0] >= loc_b[0] && loc_a[0] < loc_b[1]) {
            return true;
        }
        if (loc_a[1] > loc_b[0] && loc_a[1] <= loc_b[1]) {
            return true;
        }
        return false;
    },

    get_spans_list_by_tag: function(tag_def, ann) {
        var spans_dict = {};
        for (let i = 0; i < ann.tags.length; i++) {
            const tag = ann.tags[i];
            if (tag.tag == tag_def.name) {
                spans_dict[tag.spans] = 1;
            }
        }

        // conver the dictionary to list
        var spans_list = Object.keys(spans_dict);
        return spans_list;
    }
};