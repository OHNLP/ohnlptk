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

    parse: function(fn, text) {
        var ann = this.xml2ann(fn, text);
        return ann;
    },

    txt2ann: function(dtd_name, txt) {

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
        const xmlStr = serializer.serializeToString(xmlDoc);

        if (typeof(pretty)=='undefined') {
            pretty = true;
        }

        if (pretty) {
            var xml_prettify = require('xml-formatter');
            var pretty_xmlStr = xml_prettify(xmlStr);
            return pretty_xmlStr;
        }

        return xmlStr;
    }
};