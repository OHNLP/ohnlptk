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
        
        return xmlDoc;
    }
};