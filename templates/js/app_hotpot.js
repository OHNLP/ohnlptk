var app_hotpot = {
    vpp: null,
    vpp_id: '#app_hotpot',

    vpp_data: {
        has_dtd: false,
        dtd: null,
        ann: null
    },

    sample: {
        ann: {
            fn: 'test.txt_1.xml',
            text: 'The patient had a dry cough and fever or chills yesterday. He is also experiencing new loss of taste today and three days ago.',
            tags: [{
                "tag": "AMS",
                "id": "A0",
                "spans": "4~11",
                "text": "patient",
                "status": "present",
                "experiencer": "patient",
                "certainty": "confirmed",
                "exclusion": "no",
                "CAM_criteria": "A"
            }, {
                "tag": "Delirium",
                "id": "D0",
                "spans": "32~37,41~47,65~69",
                "text": "fever ... chills ... also",
                "status": "present",
                "experiencer": "patient",
                "certainty": "confirmed",
                "exclusion": "no"
            }]
        }
    },

    vpp_methods: {
        download_xml: function() {

        },

        show_about: function() {

        }
    },

    init: function() {
        this.vpp_data.ann = this.sample.ann;
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
        console.log('* set dtd', dtd);
        this.vpp.$data.has_dtd = true;
        this.vpp.$data.dtd = dtd;
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

    parse_drop_dtd: function(fileEntry) {
        app_hotpot.read_file_async(fileEntry, function(evt) {
            var text = evt.target.result;
            // console.log('* read dtd', text);

            // try to parse this dtd file
            var dtd = dtd_parser.parse(text);
            
            // ok, set the dtd for annotator
            app_hotpot.set_dtd(dtd);
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