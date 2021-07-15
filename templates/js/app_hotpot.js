var app_hotpot = {
    vpp: null,
    vpp_id: '#app_hotpot',

    vpp_data: {
        has_dtd: false,
        has_ann: false,
        dtd: null,
        ann: null
    },

    vpp_methods: {
        download_xml: function() {

        },

        show_about: function() {

        },

        update_tag_table: function(tag) {
            console.log('* update tag table', tag);
        },

        /////////////////////////////////////////////////////////////////
        // Context Menu Related
        /////////////////////////////////////////////////////////////////
        ctxmenu_add_tag: function(tag) {
            app_hotpot.ctxmenu_sel.hide();
        },

        ctxmenu_close: function() {
            app_hotpot.ctxmenu_sel.hide();
        },

        count_n_tags: function(tag) {
            if (!this.has_ann) {
                return '';
            }
            var cnt = 0;
            if (tag == null) {
                return this.ann.tags.length;
            }
            for (let i = 0; i < this.ann.tags.length; i++) {
                if (this.ann.tags[i].tag == tag.name) {
                    cnt += 1;
                }
            }
            return cnt;
        }
    },

    // code mirror instance
    codemirror: null,
    // marked texts in code mirror
    marktexts: [],
    // the selected text
    selection: null,

    // the context menu for selection
    ctxmenu_sel: null,

    // sample: {
    //     ann: {
    //         fn: 'test.txt_1.xml',
    //         text: 'The patient had a dry cough and fever or chills yesterday. He is also experiencing new loss of taste today and three days ago.',
    //         dtd_name: 'delirium',
    //         tags: [{
    //             "tag": "AMS",
    //             "id": "A0",
    //             "spans": "4~11",
    //             "text": "patient",
    //             "status": "present",
    //             "experiencer": "patient",
    //             "certainty": "confirmed",
    //             "exclusion": "no",
    //             "CAM_criteria": "A"
    //         }, {
    //             "tag": "Delirium",
    //             "id": "D0",
    //             "spans": "32~37,41~47,65~69",
    //             "text": "fever ... chills ... also",
    //             "status": "present",
    //             "experiencer": "patient",
    //             "certainty": "confirmed",
    //             "exclusion": "no"
    //         }]
    //     }
    // },

    init: function() {
        // this.vpp_data.ann = this.sample.ann;
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
        this.bind_dropzone_ann();

        // the code mirror
        this.init_codemirror();

        // the global event
        this.bind_events();

        // set the resize
        this.resize();
    },

    init_codemirror: function() {
        // init the code mirror instance
        this.codemirror = CodeMirror(
            document.getElementById('cm_editor'), {
                lineNumbers: true,
                readOnly: true,
                lineWrapping: true,
                lint: true
            }
        );

        this.codemirror.on('contextmenu', function(inst, evt) {
            evt.preventDefault();
            app_hotpot.selection = {
                sel_txts: inst.getSelections(),
                sel_locs: inst.listSelections()
            };
            console.log("* found selection:", app_hotpot.selection);

            // show the menu
            var mouseX = evt.clientX;
            var mouseY = evt.clientY;
            app_hotpot.show_tag_ctxmenu(mouseX, mouseY);
        });
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

        // update the color define
        this.update_tag_styles();

        // update the context menu
        this.update_tag_ctxmenu();

        // force update
        this.vpp.$forceUpdate();
    },

    set_ann: function(ann) {
        console.log("* set ann", ann);
        this.vpp.$data.has_ann = true;
        this.vpp.$data.ann = ann;

        // update the text display
        this.codemirror.setValue(this.vpp.$data.ann.text);

        // update the marks
        this.cm_update_marks();
    },

    bind_events: function() {
        document.getElementById('app_hotpot').addEventListener(
            "click",
            function(event) {
                console.log('* clicked on', event.target);
                if (app_hotpot.ctxmenu_sel != null) {
                    app_hotpot.ctxmenu_sel.hide();
                }
            }
        );
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

    bind_dropzone_ann: function() {
        let dropzone = document.getElementById("dropzone_ann");

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
                    // ok, user select a folder
                    // well, maybe in future we could support
                    if (item.isDirectory) {
                        // show something?

                    } else {
                        // should be a ann txt/xml file
                        // so item is a fileEntry
                        app_hotpot.parse_drop_ann(item);
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

    parse_drop_ann: function(fileEntry) {
        // get the ann file
        console.log('* ann file:', fileEntry);

        // set the file name
        ann_parser.filename = fileEntry.name;

        // read this file
        app_hotpot.read_file_async(fileEntry, function(evt) {
            var text = evt.target.result;

            // try to parse this dtd file
            var ann = ann_parser.parse(text);
            
            // ok, set the dtd for annotator
            app_hotpot.set_ann(ann);
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
        $('#main_ui').css('height', h - 170);
    },

    /////////////////////////////////////////////////////////////////
    // DTD update related
    /////////////////////////////////////////////////////////////////
    // the default colors are from
    // https://colorbrewer2.org/#type=qualitative&scheme=Set3&n=12
    app_colors: [
        '#a6cee3',
        '#1f78b4',
        '#b2df8a',
        '#33a02c',
        '#fb9a99',
        '#e31a1c',
        '#fdbf6f',
        '#ff7f00',
        '#cab2d6',
        '#6a3d9a',
        '#ffff99',
        '#b15928',
        '#8dd3c7',
        '#ffffb3',
        '#bebada',
        '#fb8072',
        '#80b1d3',
        '#fdb462',
        '#b3de69',
        '#fccde5',
        '#d9d9d9',
        '#bc80bd',
        '#ccebc5',
        '#ffed6f',
    ],

    app_shortcuts: [
        '1',
        '2',
        '3',
        '4',
        'q',
        'w',
        'e',
        'r',
        'a',
        's',
        'd',
        'f',
        'z',
        'x',
        'c',
        'v',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
    ],

    update_tag_styles: function() {
        // get my style
        var style = document.getElementById('app_style').sheet;

        // check each tag
        var i = 0;
        for (const tag_name in this.vpp.$data.dtd.tag_dict) {
            if (Object.hasOwnProperty.call(this.vpp.$data.dtd.tag_dict, tag_name)) {
                const tag = this.vpp.$data.dtd.tag_dict[tag_name];
                
                // add a new style for this tag
                var color = 'white';
                if ( i < this.app_colors.length ) {
                    // use default color
                    color = this.app_colors[i];
                } else {
                    // we don't have enough colors now
                    // just use a random color
                    color = '#' + Math.floor(Math.random()*16777215).toString(16);
                }
                
                // add this tag as the given color
                style.insertRule(
                    ".mark-" + tag_name + " { background-color: " + color + "; }",
                    0
                );
                style.insertRule(
                    ".fg-tag-" + tag_name + " { color: " + color + " !important; }",
                    0
                );

                i += 1;
            }
        }
    },

    show_tag_ctxmenu: function(x, y) {
        console.log("* show ctx menu on ", x, y);
        this.ctxmenu_sel.css('left', (x + 10) + 'px')
            .css('top', y + 'px')
            .show('drop', {}, 200, null);
    },

    update_tag_ctxmenu: function() {
        // update the context menu
        this.ctxmenu_sel = $('#ctxmenu_sel').menu({
            items: "> :not(.ui-widget-header)"
        });
    },

    /////////////////////////////////////////////////////////////////
    // Code Mirror Related
    /////////////////////////////////////////////////////////////////
    cm_update_marks: function() {
        // clear and add the markers
        for (let i = 0; i < this.marktexts.length; i++) {
            var marktext = this.marktexts[i];
            marktext.clear();
        }
        this.marktexts.slice(0, this.marktexts.length);

        for (let i = 0; i < this.vpp.$data.ann.tags.length; i++) {
            var tag = this.vpp.$data.ann.tags[i];
            this.cm_mark_obj_in_text(tag, this.vpp.$data.ann.text);
        }

        this.vpp.$forceUpdate();
    },

    cm_mark_obj_in_text: function(tag, text) {
        var tag_id = tag['id'];
        var raw_spans = tag['spans'];
        if (raw_spans == '' || raw_spans == null) { 
            return [-1]; 
        }

        // the spans may contains multiple parts
        // split them first
        var spans_arr = raw_spans.split(',');
        
        for (let i = 0; i < spans_arr.length; i++) {
            const spans = spans_arr[i];
            var rst = this._calc_spans2range(spans, text);
            var ln0 = rst[0][0];
            var ch0 = rst[0][1];
            var ln1 = rst[1][0];
            var ch1 = rst[1][1];

            // add mark to text
            this.marktexts.push(this.codemirror.markText(
                {line: ln0, ch: ch0},
                {line: ln1, ch: ch1},
                {className: 'mark-label mark-' + tag.tag + ' mark-id-' + tag_id}
            ));
        }
    },

    _calc_range2spans: function(sel_loc, full_txt) {
        console.log('* calc_range2spans: ');
        console.log(sel_loc);
        var lines = full_txt.split('\n');
        var span0 = 0;
        for (let i = 0; i < sel_loc.anchor.line; i++) {
            span0 += lines[i].length + 1;
        }
        span0 += sel_loc.anchor.ch;
        var span1 = 0;
        for (let i = 0; i < sel_loc.head.line; i++) {
            span1 += lines[i].length + 1;
        }
        span1 += sel_loc.head.ch;
        console.log('* span0: ' + span0 + ', span1: ' + span1);

        if (span0 <= span1) {
            return span0 + '~' + span1;
        } else {
            return span1 + '~' + span0;
        }
    },

    _calc_spans2range: function(spans, text) {
        var span_pos_0 = parseInt(spans.split('~')[0]);
        var span_pos_1 = parseInt(spans.split('~')[1]);

        // calculate the line number
        var ln0 = text.substring(0, span_pos_0).split('\n').length - 1;
        var ln1 = text.substring(0, span_pos_1).split('\n').length - 1;

        // calculate the char location
        var ch0 = span_pos_0;
        for (let i = 1; i < span_pos_0; i++) {
            if (text[span_pos_0 - i] == '\n') {
                ch0 = i - 1;
                break;
            }
        }
        var ch1 = ch0 + (span_pos_1 - span_pos_0);

        return [ [ln0, ch0], [ln1, ch1] ];
    },

};