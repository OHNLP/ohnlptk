var dtd_parser = {
    regex: {
        entity: /\<\!ENTITY\ name\ "([a-zA-Z\-0-9\_]+)"\>/gmi,
        element: /^\<\!ELEMENT\s+([a-zA-Z\-0-9\_]+)\s.+/gmi,
        attlist: /^\<\!ATTLIST\s+([a-zA-Z\-0-9\_]+)\s([a-zA-Z0-9\_]+)\s+(\S+)\s/gmi,
        attlist_values: /\(([a-zA-Z0-9\_\ \|]+)\)/gmi,
    },

    parse: function(text) {
        var lines = text.split('\n');

        var dtd = {
            id_prefixd: {},
            name: '',
            tag_dict: {},
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
                dtd.tag_dict[ret.name] = ret;

            } else if (ret.type == 'ltag') {
                // check the id
                if (dtd.id_prefixd.hasOwnProperty(ret.id_prefix)) {
                    ret.id_prefix = this.get_next_id_prefix(ret);
                }
                dtd.id_prefixd[ret.id_prefix] = ret;
                dtd.tag_dict[ret.name] = ret;

            } else if (ret.type == 'attr') {
                // put this attr to an element
                dtd.tag_dict[ret.element].attlists.push(
                    ret
                );

            } else {
                // what???
            }
        }

        // split the tags
        for (const name in dtd.tag_dict) {
            if (Object.hasOwnProperty.call(dtd.tag_dict, name)) {
                const element = dtd.tag_dict[name];
                if (element.type == 'etag') {
                    dtd.etags.push(element);
                } else {
                    dtd.ltags.push(element);
                }
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
        if (ret != null) { return ret; }

        // try attlist
        ret = this.get_attlist(line);

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

    get_attlist: function(line) {
        let m;
        var ret = null;
        let regex = this.regex.attlist;

        while ((m = regex.exec(line)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            var attlist = {
                element: '',
                name: '',
                type: 'attr',
                vtype: '',
                values: [],
                default_value: ''
            };
            // The result can be accessed through the `m`-variable.
            m.forEach((match, groupIndex) => {
                console.log(`Found attlist match, group ${groupIndex}: ${match}`);
                // group 0 is the leading text
                if (groupIndex == 1) {
                    // which is the element name
                    attlist.element = match;

                } else if (groupIndex == 2) {
                    // which means it is the attr of this element
                    attlist.name = match;

                    // special rule for some attrs
                    if (match == 'spans') {
                        // for attr `spans`, need to update the elememt
                        attlist.vtype = 'dfix';
                    }

                } else if (groupIndex == 3) {
                    if (match == 'CDATA') {
                        // ok, it's just a text content
                        attlist.vtype = 'text';

                    } else if (match == '(') {
                        // this is a list
                        attlist.vtype = 'list';

                        // get the values
                        attlist.values = this.get_attlist_values(line);

                    } else if (match == 'IDREF') {
                        // it's an attr for link tag
                        attlist.vtype = 'idref';

                    } else if (match.startsWith('#')) {
                        // sometimes ...
                    }
                } else {
                    // what?
                }
            });

            ret = attlist;
        }

        return ret;
    },

    get_attlist_values: function(line) {
        let m;
        var ret = [];
        let regex = this.regex.attlist_values;

        while ((m = regex.exec(line)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            var values = [];
            // The result can be accessed through the `m`-variable.
            m.forEach((match, groupIndex) => {
                console.log(`Found attlist values match, group ${groupIndex}: ${match}`);
                // group 0 is the leading text
                if (groupIndex == 1) {
                    // which is the element name
                    var ps = match.split('|');
                    for (let i = 0; i < ps.length; i++) {
                        const p = ps[i];
                        var _p = p.trim();
                        values.push(_p);
                    }
                } 
            });

            ret = values;
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