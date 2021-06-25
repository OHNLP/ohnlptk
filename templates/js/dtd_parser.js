var dtd_parser = {
    regex: {
        entity: /\<\!ENTITY\ name\ "([a-zA-Z\-0-9\_]+)"\>/gmi,
        element: /^\<\!ELEMENT\s+([a-zA-Z\-0-9\_]+)\s.+/gmi,
        attlist: /^\<\!ATTLIST\s+([a-zA-Z\-0-9\_]+)\s([a-zA-Z0-9\_]+)\s+/gmi,
    },

    parse: function(text) {
        var lines = text.split('\n');

        var dtd = {
            id_prefixd: {},
            name: '',
            etags: [],
            ltags: []
        };

        for (let l = 0; l < lines.length; l++) {
            const line = lines[l];
            
            // check this line
            var ret = this.parse_line(line);

            if (ret == null) {
                // nothing happens
                continue;

            } else if (ret.type == 'entity') {
                dtd.name = ret.name;

            } else if (ret.type == 'etag') {
                // check the id
                if (dtd.id_prefixd.hasOwnProperty(ret.id_prefix)) {
                    ret.id_prefix = this.get_next_id_prefix(ret);
                }
                dtd.id_prefixd[ret.id_prefix] = ret;
                dtd.etags.push(ret);

            } else if (ret.type == 'ltag') {
                // check the id
                if (dtd.id_prefixd.hasOwnProperty(ret.id_prefix)) {
                    ret.id_prefix = this.get_next_id_prefix(ret);
                }
                dtd.id_prefixd[ret.id_prefix] = ret;
                dtd.ltags.push(ret);

            } else {
                // what???
            }
        }

        return dtd;
    },

    parse_line: function(line) {
        var obj = null;
        var ret = null;

        // try entity
        ret = this.get_entity(line);
        if (ret != null) { return ret; }

        // try element
        ret = this.get_element(line);

        return ret;
    },

    get_idref_attlists: function(text) {
        let m;
        var ret = [];
        let regex = this.regex.idref_attlist;

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

    get_cdataset_attlists: function(text) {
        let m;
        var ret = [];
        let regex = this.regex.cdataset_attlist;

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
                    if (typeof(match) == 'undefined') {
                        // what???

                    } else if (match == '') {
                        // usually this is the CDATA attr
                        attlist.default_value = '';

                    } else if (match.lastIndexOf('#IMPLIED') >= 0) {
                        // ok, we have some kind of default value
                        var t = match.replace('#IMPLIED', '');
                        t = t.replace(/"/g, '');
                        t = t.replace(/\>/g, '');
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
        var ret = null;
        let regex = this.regex.entity;

        while ((m = regex.exec(text)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            
            // The result can be accessed through the `m`-variable.
            m.forEach((match, groupIndex) => {
                console.log(`Found entity match, group ${groupIndex}: ${match}`);
                ret = {
                    name: match,
                    type: 'entity'
                };
            });
        }

        return ret;
    },

    get_element: function(line) {
        let m;
        var ret = null;
        let regex = this.regex.element;

        while ((m = regex.exec(line)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            var element = {
                name: '',
                type: 'etag',
                id_prefix: '',
                is_non_consuming: false,
                attlists: []
            };

            // The result can be accessed through the `m`-variable.
            m.forEach((match, groupIndex) => {
                console.log(`Found element match, group ${groupIndex}: ${match}`);
                // group 0 is the leading line
                if (groupIndex == 1) {
                    element.name = match;
                    element.id_prefix = match.substring(0, 1);
                } 
            });
        
            // check the element type
            if (line.lastIndexOf('EMPTY')>=0) {
                element.type = 'ltag';
            }

            ret = element;
        }

        return ret;

    },

    get_next_id_prefix: function(element) {
        var ret = element.name.substring(
            0,
            element.id_prefix.length + 1
        );

        return ret;
    }
};