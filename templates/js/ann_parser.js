/**
 * Annotation file parser
 * 
 * The ann used in this tool is an object following this format:
 * {
 *  _fh: FileSystemHandle,
 *  _has_saved: true/false,
 *  text: '',
 *  dtd_name: '',
 *  tags: []
 * }
 * 
 * the `_fh` is added outside of parser.
 * the `_has_saved` is added outside
 */
var ann_parser = {

    parse: function(text) {
        var ann = this.xml2ann(text);
        return ann;
    },

    txt2ann: function(dtd_name, txt) {
        var ann = {
            text: txt,
            dtd_name: dtd_name,
            tags: []
        };

        return ann;
    },

    xml2ann: function(text) {
        // create a new DOM parser
        var parser = new DOMParser();

        // parse the given text
        var xmlDoc = parser.parseFromString(text, "text/xml");

        // create an empty ann
        var ann = {
            text: '',
            dtd_name: '',
            tags: []
        };

        // first, get the dtd name
        var dtd_name = xmlDoc.children[0].tagName;
        ann.dtd_name = dtd_name;

        // then get the text content
        var textContent = xmlDoc.getElementsByTagName('TEXT')[0].textContent;
        ann.text = textContent;

        // then check all of the tags
        var elems = xmlDoc.getElementsByTagName('TAGS')[0].children;

        for (let i = 0; i < elems.length; i++) {
            var elem = elems[i];

            // get the attributes
            var tag_name = elem.tagName;

            // create a new empty tag
            var tag = {
                tag: tag_name
            };

            // get all attr names
            var attrs = elem.getAttributeNames();

            // get all attr values
            for (let j = 0; j < attrs.length; j++) {
                var attr = attrs[j];
                var value = elem.getAttribute(attr);
                
                // put this value into tag
                tag[attr] = value;
            }

            // then, put this new tag to the ann tags list
            ann.tags.push(tag);
        }

        return ann;
    },

    ann2xml: function(ann) {
        // create the root document
        var xmlDoc = document.implementation.createDocument(
            null, ann.dtd_name
        );
        var root = xmlDoc.getElementsByTagName(ann.dtd_name)[0];
        // var root = xmlDoc.getRootNode();

        // create the CDATA section for TEXT
        var node_TEXT = xmlDoc.createElement('TEXT');
        node_TEXT.appendChild(
            xmlDoc.createCDATASection(ann.text)
        );
        root.appendChild(node_TEXT);

        // create the tags
        var node_TAGS = xmlDoc.createElement('TAGS');
        for (let i = 0; i < ann.tags.length; i++) {
            const tag = ann.tags[i];

            // create a node for this tag
            var node_tag = xmlDoc.createElement(tag.tag);

            // create all attributes
            for (const attr in tag) {
                if (attr == 'tag') {
                    // skip the tag name itself
                    continue;
                }
                // bind this node_attr to the node_tag
                node_tag.setAttribute(attr, tag[attr]);
            }

            // append this node to TAGS
            node_TAGS.appendChild(node_tag);
        }
        root.appendChild(node_TAGS);
        
        return xmlDoc;
    },

    xml2str: function(xmlDoc, pretty) {
        const serializer = new XMLSerializer();
        var xmlStr = serializer.serializeToString(xmlDoc);

        // fix missing 
        if (xmlStr.startsWith('<?xml')) {
            // nothing, it' OK
        } else {
            xmlStr = '<?xml version="1.0" encoding="UTF-8" ?>\n' + xmlStr;
        }

        if (typeof(pretty)=='undefined') {
            pretty = true;
        }

        if (pretty) {
            // var pretty_xmlStr = vkbeautify.xml(xmlStr, 0);
            // return pretty_xmlStr;
            
        }

        return xmlStr;
    },

    /**
     * Convert a list of anns to hints as tag name dict
     * @param {object} dtd annotation dtd object
     * @param {list} anns a list of annotation objects
     */
     anns2hint_dict: function(dtd, anns) {
        var hint_dict = {};

        for (let i = 0; i < anns.length; i++) {
            const ann = anns[i];
            for (let j = 0; j < ann.tags.length; j++) {
                const tag = ann.tags[j];
                // create the tagDef if not exists
                if (!hint_dict.hasOwnProperty(tag.tag)) {
                    // the text_dict is for searching
                    // the texts is for storing
                    hint_dict[tag.tag] = {
                        text_dict: {},
                        texts: []
                    };
                }

                // empty text should be removed
                var text = tag.text;
                text = text.trim();
                if (text == '') {
                    continue;
                }

                if (hint_dict[tag.tag].text_dict.hasOwnProperty(text)) {
                    // oh, this is NOT a new text
                    // just increase the count
                    hint_dict[tag.tag].text_dict[text] += 1;

                } else {
                    // ok, this is a new text
                    // count +1
                    hint_dict[tag.tag].text_dict[text] = 1;

                    // save this tag
                    hint_dict[tag.tag].texts.push(text);
                }
            }
        }

        return hint_dict;
    },

    add_tag_to_hint_dict: function(tag, hint_dict) {
        if (!hint_dict.hasOwnProperty(tag.tag)) {
            hint_dict[tag.tag] = {
                text_dict: {},
                texts: []
            }
        }
        // empty text should be removed
        var text = tag.text;
        text = text.trim();
        if (text == '') {
            // just return the given hint_dict if empty text
            return hint_dict;
        }

        // add this text
        if (hint_dict[tag.tag].text_dict.hasOwnProperty(text)) {
            // oh, this is NOT a new text
            // just increase the count
            hint_dict[tag.tag].text_dict[text] += 1;

        } else {
            // ok, this is a new text
            // count +1
            hint_dict[tag.tag].text_dict[text] = 1;

            // save this tag
            hint_dict[tag.tag].texts.push(text);
        }

        return hint_dict;
    },

    /**
     * Search feasible hints to ranges for highlighting in codemirror
     * Those conflict / overlaped hints would be skiped
     * 
     * @param {object} hints The hints object contains all hint texts
     * @param {object} ann The annotation object which contains text and tags
     */
    search_hints_in_ann: function(hint_dict, ann) {
        var is_overlapped = function(a, b) {
            if (a[0] >= b[0] && a[0] < b[1]) {
                return true;
            }
            if (a[1] > b[0] && a[1] <= b[1]) {
                return true;
            }
            return false;
        }

        var is_overlapped_in_list = function(loc_x, loc_list) {
            for (let i = 0; i < loc_list.length; i++) {
                const loc = loc_list[i];
                if (is_overlapped(loc_x, loc)) {
                    return true;
                }
            }
            return false;
        }

        // for saving the locations of all marks 
        var loc_list = [];

        // for saving those hints need to be marked
        var hint_list = [];

        // for saving existing hint strs and mapping to tags
        var str_dict = {};

        // first, put existed ann tags in to mark dict
        for (let i = 0; i < ann.tags.length; i++) {
            const tag = ann.tags[i];
            var spans = tag.spans.split(',');
            for (let j = 0; j < spans.length; j++) {
                const span = spans[j];
                var loc = this.span2loc(span);
                loc_list.push(loc);
            }
        }
        console.log('* created loc_list', loc_list);
        
        // check each tag in the hint
        for (const tag_name in hint_dict) {
            if (Object.hasOwnProperty.call(hint_dict, tag_name)) {
                // check each str in this hint tag
                for (let i = 0; i < hint_dict[tag_name].texts.length; i++) {
                    const str = hint_dict[tag_name].texts[i];
                    // if this str exists, just skip
                    if (str_dict.hasOwnProperty(str)) { 
                        if (str_dict[str].tags.hasOwnProperty(tag_name)) {
                        } else {
                            str_dict[str].tags[tag_name] = 1;
                        }
                        continue; 
                    }

                    // put this str to global dict first
                    str_dict[str] = {
                        tags: {}
                    };
                    str_dict[str].tags[tag_name] = 1;

                    // then find the locs of this str in
                    var locs = this.get_locs(str, ann.text);

                    for (let j = 0; j < locs.length; j++) {
                        const loc = locs[j];
                        
                        // we need to check whether this loc exsits
                        if (is_overlapped_in_list(loc, loc_list)) {
                            // ok, skip this
                        } else {
                            // append this loc to the list
                            loc_list.push(loc);

                            // and add this loc as a new mark
                            hint_list.push({
                                id: 'hint-' + tag_name + '-' + i + '-' + j,
                                tag: tag_name,
                                text: str,
                                loc: loc,
                                range: this.loc2range(loc, ann.text)
                            })
                        }
                    }
                }
            }
        }

        return hint_list;
    },

    get_locs: function(str, text) {
        var regex = new RegExp('\\b' + str + '\\b', 'gmi');

        var m;
        var locs = [];
        while ((m = regex.exec(text)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            
            // The result can be accessed through the `m`-variable.
            m.forEach((match, groupIndex) => {
                locs.push([ m.index, regex.lastIndex]);
            });
        }

        return locs;
    },

    span2loc: function(span) {
        var ps = span.split('~');
        var span_pos_0 = parseInt(ps[0]);
        var span_pos_1 = parseInt(ps[1]);
        return [
            span_pos_0,
            span_pos_1
        ];
    },

    loc2range: function(loc, text) {
        // calculate the line number
        var ln0 = text.substring(0, loc[0]).split('\n').length - 1;
        var ln1 = text.substring(0, loc[1]).split('\n').length - 1;

        // calculate the char location
        var ch0 = loc[0];
        for (let i = 1; i < loc[0]; i++) {
            if (text[loc[0] - i] == '\n') {
                ch0 = i - 1;
                break;
            }
        }
        var ch1 = ch0 + (loc[1] - loc[0]);

        return [ [ln0, ch0], [ln1, ch1] ];
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
    }
};