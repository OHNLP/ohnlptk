var dtd_parser = {
    regex: {
        entity: /\<\!ENTITY\ name\ "([a-zA-Z\-0-9\_]+)"\>/gmi,
        element: /^\<\!ELEMENT\s+([a-zA-Z\-0-9\_]+)\s((\([#A-Z\ ]+\))|(EMPTY))/gmi,
        attlist_etag: /^\<\!ATTLIST\s+([a-zA-Z\-0-9\_]+)\s([a-zA-Z0-9\_]+)\s+((\([\ a-zA-Z0-9\|\-\_]+\))|(CDATA))\s+((\#IMPLIED\s[\"a-zA-Z0-9\_\-]*)|([\"]+))/gmi,
        attlist_ltag: /^\<\!ATTLIST\s+([a-zA-Z\-0-9\_]+)\s([arg0-9]+)\s+(IDREF)\s+(prefix="[a-zA-Z0-9\_]+")\s(#[A-Z]+)/gmi
    },

    parse: function(text) {
        // get the entity of dtd
        var entity = this.get_entity(text);
        console.log('* found entity:', entity);

        // get the elements of dtd
        var elements = this.get_elements(text);
        console.log('* found elements:', elements);

        // get the attlists
        var etag_attlists = this.get_etag_attlists(text);
        console.log('* found etag_attlists:', etag_attlists);

        var dtd = {
            name: entity,
            etags: [],
            ltags: []
        };

        return dtd;
    },

    get_etag_attlists: function(text) {
        let m;
        var ret = [];
        let regex = this.regex.attlist_etag;

        while ((m = regex.exec(text)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            var attlist = {
                element: '',
                name: '',
                type: '',
                values: [],
                default_value: ''
            };
            // The result can be accessed through the `m`-variable.
            m.forEach((match, groupIndex) => {
                console.log(`Found etag attlist match, group ${groupIndex}: ${match}`);
                // group 0 is the leading text
                if (groupIndex == 1) {
                    // which is the element name
                    attlist.element = match;

                } else if (groupIndex == 2) {
                    // which means it is the att of this element
                    attlist.name = match;

                } else if (groupIndex == 3) {
                    if (match == 'CDATA') {
                        // ok, it's just a text content
                        attlist.type = 'text';
                    } else if (match.lastIndexOf('(')>=0) {
                        // this is a list
                        attlist.type = 'list';

                        // then let's parse the content
                        var t = match.replace('(', '');
                        t = t.replace(')', '');
                        var ps = t.split('|');

                        // ok, then we put the values into a 
                        var vals = [];

                        for (let i = 0; i < ps.length; i++) {
                            const p = ps[i];
                            var _p = p.trim();
                            vals.push(_p);
                        }
                        // ok, done with this list item
                        attlist.values = vals;

                    } else {
                        // ? what happens?
                    }
                } else if (groupIndex == 6) {
                    // which is the default value for this attributre
                    if (match == '') {
                        // usually this is the CDATA attr
                        attlist.default_value = '';
                    } else if (match.lastIndexOf('#IMPLIED') >= 0) {
                        // ok, we have some kind of default value
                        var t = match.replace('#IMPLIED', '');
                        t = t.replace(/"/g, '');
                        t = t.trim();
                        attlist.default_value = t;
                    } else {
                        // ? what happens?
                    }
                }
            });

            ret.push(attlist);
        }

        return ret;
    },

    get_entity: function(text) {
        let m;
        var ret = '';
        let regex = this.regex.entity;

        while ((m = regex.exec(text)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            
            // The result can be accessed through the `m`-variable.
            m.forEach((match, groupIndex) => {
                console.log(`Found entity match, group ${groupIndex}: ${match}`);
                ret = match;
            });
        }

        return ret;
    },

    get_elements: function(text) {
        let m;
        var ret = [];
        let regex = this.regex.element;

        while ((m = regex.exec(text)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            var element = {
                name: '',
                type: '',
                attrs: []
            };
            // The result can be accessed through the `m`-variable.
            m.forEach((match, groupIndex) => {
                console.log(`Found element match, group ${groupIndex}: ${match}`);
                // group 0 is the leading text
                if (groupIndex == 1) {
                    element.name = match;

                } else if (groupIndex == 2) {
                    // which means it is the type of this element
                    if (match == 'EMPTY') {
                        element.type = 'ltag';
                    } else {
                        element.type = 'etag';
                    }
                }
            });

            ret.push(element);
        }

        return ret;

    },
};