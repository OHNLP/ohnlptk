var app_hotpot = {
    vpp: null,
    vpp_id: '#app_hotpot',

    dtd: {
        def: null,
        regex: {
            entity: /\<\!ENTITY\ name\ "([a-zA-Z\-0-9\_]+)"\>/gmi,
            element: /^\<\!ELEMENT\s+([a-zA-Z\-0-9\_]+)\s/gmi
        }
    },

    vpp_data: {
        has_dtd: false,
        dtd: null
    },

    vpp_methods: {
        download_xml: function() {

        },

        show_about: function() {

        }
    },

    init: function() {
        this.vpp = new Vue({
            el: this.vpp_id,
            data: this.vpp_data,
            methods: this.vpp_methods,

            mounted: function () {
                Metro.init();
            },
        });

        // bind other events
        this.bind_dropzone_dtd();

        this.resize();

    },

    /**
     * Set the DTD for this annotation project
     * 
     * @param {Object} dtd An object of dtd
     * 
     * {
     *     name: "The name of this dtd",
     *     entities: [
     *         "entities 1", "entities 2", ...
     *     ]
     * }
     */
    set_dtd: function(dtd) {
        this.vpp.$data.has_dtd = true;
        this.vpp.$data.dtd = dtd;
        console.log('* set dtd', dtd);
    },

    bind_dropzone_dtd: function() {
        let dropzone = document.getElementById("dropzone_dtd");

        dropzone.addEventListener("dragover", function(event) {
            event.preventDefault();
        }, false);

        dropzone.addEventListener("drop", function(event) {
            let items = event.dataTransfer.items;
        
            event.preventDefault();
        
            // user should only upload one folder or a file
            if (items.length>1) {
                console.log('* selected more than 1 item!');
                return;
            }

            for (let i=0; i<items.length; i++) {
                let item = items[i].webkitGetAsEntry();
        
                if (item) {
                    // ok, user select a folder ???
                    if (item.isDirectory) {
                        // show something?


                    } else {
                        // should be a dtd file
                        // so item is a fileEntry
                        app_hotpot.parse_drop_dtd(item);
                    }
                }

                // just detect one item, folder or zip
                break;
            }

        }, false);
    },

    get_entity: function(text) {
        let m;
        var ret = '';
        let regex = this.dtd.regex.entity;

        while ((m = regex.exec(text)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            
            // The result can be accessed through the `m`-variable.
            m.forEach((match, groupIndex) => {
                console.log(`Found match, group ${groupIndex}: ${match}`);
                ret = match;
            });
        }

        return ret;
    },

    get_elements: function(text) {
        let m;
        var ret = [];
        let regex = this.dtd.regex.element;

        while ((m = regex.exec(text)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            
            // The result can be accessed through the `m`-variable.
            m.forEach((match, groupIndex) => {
                console.log(`Found match, group ${groupIndex}: ${match}`);
                // group 0 is the leading text
                if (groupIndex == 1) {
                    ret.push(match);
                }
            });
        }

        return ret;

    },

    parse_drop_dtd: function(fileEntry) {
        app_hotpot.read_file_async(fileEntry, function(evt) {
            var text = evt.target.result;
            // console.log('* read dtd', text);

            // get the entity of dtd
            var entity = app_hotpot.get_entity(text);
            console.log('* found entity:', entity);

            // get the elements of dtd
            var entities = app_hotpot.get_elements(text);
            console.log('* found entities:', entities);

            // ok, set the dtd for annotator
            app_hotpot.set_dtd({
                name: entity,
                entities: entities
            });
        });
    },

    read_file_async: function(fileEntry, callback) {
        fileEntry.file(function(file) {
            let reader = new FileReader();
            reader.onload = callback;
            reader.readAsText(file)
        });
    },

    resize: function() {
        var h = $(window).height();
        $('#main_ui').css('height', h - 240);
    }
};