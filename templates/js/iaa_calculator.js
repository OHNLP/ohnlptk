var iaa_calculator = {

    evaluate_anns_on_dtd: function(dtd, anns_a, anns_b, match_mode) {
        if (typeof(match_mode) == 'undefined') {
            match_mode = 'overlap';
        }
        /* we will build a dictionary for this task
        {
            ann: {
                text_hash: {
                    anns: [ann_a, ann_b],
                    result_dict: {
                        tag_name: result
                    }
                },
                ...
            },
            all: {pre, rec, f1, cm},
            tag: {
                tag_a: {pre, rec, f1, cm},
            }
        },
        */
        var iaa_dict = {
            ann: {}, // for the file
            all: {},
            tag: {}
        };
        var stat = {
            duplicates: [],
            unmatched: [],
        };
        
        // first, let's check all anns_a
        for (let i = 0; i < anns_a.length; i++) {
            const ann_a = anns_a[i];
            var hashcode = this.hash(ann_a.text);

            if (iaa_dict.hasOwnProperty(hashcode)) {
                // what??? duplicated text in anns_a?
                stat.duplicates.push(ann_a);
                console.log('* found duplicated ann', ann_a);
                continue;
            }

            // ok, let's create a new item here
            iaa_dict.ann[hashcode] = {
                anns: [ann_a],
                ann_result: {},
            }
        }

        // second, let's check all anns_b
        for (let i = 0; i < anns_b.length; i++) {
            const ann_b = anns_b[i];
            var hashcode = this.hash(ann_b.text);
            
            if (!iaa_dict.ann.hasOwnProperty(hashcode)) {
                // what, this text is NOT in anns_a?
                stat.unmatched.push(ann_b);
                console.log('* found unmatched ann', ann_b);
                continue;
            }
            // let's save this ann_b
            iaa_dict.ann[hashcode].anns.push(ann_b);

            // OK, this ann_b could be matched with ann_a
            var ann_a = iaa_dict.ann[hashcode].anns[0];

            // now, time to evaluate
            var ann_result = this.evaluate_ann_on_dtd(
                dtd,
                ann_a,
                ann_b,
                match_mode
            );

            // save this result
            iaa_dict.ann[hashcode].ann_result = ann_result;
        }

        // finally, calculate the result at all and tag levels
        var cm_all = { tp: 0, fp: 0, fn: 0 };
        for (let i = 0; i < dtd.etags.length; i++) {
            const tag_def = dtd.etags[i];
            var cm_tag = { tp: 0, fp: 0, fn: 0 };
            
            for (const hashcode in iaa_dict.ann) {
                if (Object.hasOwnProperty.call(iaa_dict.ann, hashcode)) {
                    const iaa = iaa_dict.ann[hashcode];
                    // add the result of this tag
                    cm_tag.tp += iaa.ann_result.tag[tag_def.name].cm.tp;
                    cm_tag.fp += iaa.ann_result.tag[tag_def.name].cm.fp;
                    cm_tag.fn += iaa.ann_result.tag[tag_def.name].cm.fn;
                }
            }
            // get the tag level result
            var tag_result = this.calc_p_r_f1(cm_tag);
            iaa_dict.tag[tag_def.name] = tag_result;

            // add the tag level to all
            cm_all.tp += cm_tag.tp;
            cm_all.fp += cm_tag.fp;
            cm_all.fn += cm_tag.fn;
        }
        // get the all level result
        var all_result = this.calc_p_r_f1(cm_all);
        iaa_dict.all = all_result;

        return iaa_dict;
    },

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
        var result_ann = {
            all: {},
            tag: {}
        }
        var cm_ann = { tp: 0, fp: 0, fn: 0 };
        for (let i = 0; i < dtd.etags.length; i++) {
            const tag_def = dtd.etags[i];
            var r = this.evaluate_ann_on_tag(tag_def, ann_a, ann_b, match_mode);
            result_ann.tag[tag_def.name] = r;

            // add the result of this tag
            cm_ann.tp += r.cm.tp;
            cm_ann.fp += r.cm.fp;
            cm_ann.fn += r.cm.fn;

        }
        var all_result = this.calc_p_r_f1(cm_ann);

        result_ann.all = all_result;

        return result_ann;
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

        // get all tags of this tag_def
        var tag_list_a = this.get_tag_list_by_tag(tag_def, ann_a);
        var tag_list_b = this.get_tag_list_by_tag(tag_def, ann_b);

        var cm = this.calc_matching(tag_list_a, tag_list_b);
        var result = this.calc_p_r_f1(cm);

        return result;
    },

    calc_matching: function(tag_list_a, tag_list_b, match_mode) {
        if (typeof(match_mode)=='undefined') {
            match_mode = 'overlap';
        }
        var cm = {
            tp: 0,
            fp: 0,
            fn: 0,
            
            // save the details
            tags: {
                tp: [],
                fp: [],
                fn: []
            }
        };

        // this dictionary is for generating the list for FN list
        var tag_dict_b = {};
        for (let i = 0; i < tag_list_b.length; i++) {
            const tag = Object.assign({}, tag_list_b[i]);
            tag_dict_b[tag.spans] = tag;
        }

        for (let i = 0; i < tag_list_a.length; i++) {
            var tag_a = tag_list_a[i];
            
            var is_match = this.is_tag_in_list(
                tag_a, 
                tag_list_b, 
                match_mode
            );

            if (is_match.is_in) {
                cm.tp += 1;
                cm.tags.tp.push([tag_a, is_match.tag_b]);

                // remove this tag_b from the dict
                delete tag_dict_b[is_match.tag_b.spans];

            } else {
                cm.fp += 1;
                cm.tags.fp.push([tag_a, null])
            }
        }

        cm.fn = tag_list_b.length - cm.tp;
        cm.tags.fn = Object.values(tag_dict_b).map(tag => [null, tag]);

        return cm;
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

    is_tag_in_list: function(tag, tag_list, match_mode) {
        if (typeof(match_mode)=='undefined') {
            match_mode = 'overlap';
        }
        var spans = tag.spans;
        var loc_a = this.spans2loc(spans);
        for (let i = 0; i < tag_list.length; i++) {
            var tag_b = tag_list[i];
            var spans_b = tag_b.spans;
            if (match_mode == 'overlap') {
                // for overlap mode, check ranges of two spans
                var loc_b = this.spans2loc(spans_b);
                if (this.is_overlapped(loc_a, loc_b)) {
                    return { 
                        is_in: true,
                        tag_b: tag_b
                    };
                }
                
            } else if (match_mode == 'exact') {

                if (spans == spans_b) {
                    return {
                        is_in: true,
                        tag_b: tag_b
                    };
                }
            }
        }
        return {
            is_in: false,
            tag_b: null
        };
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

    get_tag_list_by_tag: function(tag_def, ann) {
        var tag_dict = {};
        for (let i = 0; i < ann.tags.length; i++) {
            const tag = ann.tags[i];
            if (tag.tag == tag_def.name) {
                tag_dict[tag.spans] = tag;
            }
        }

        // conver the dictionary to list
        var tag_list = Object.values(tag_dict);
        return tag_list;
    },

    hash: function(str, seed = 0) {
        let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
        for (let i = 0, ch; i < str.length; i++) {
            ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
        h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
        return 4294967296 * (2097151 & h2) + (h1>>>0);
    },
};