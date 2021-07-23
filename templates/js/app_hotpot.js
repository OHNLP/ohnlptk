var app_hotpot = {
    vpp: null,
    vpp_id: '#app_hotpot',

    vpp_data: {
        has_dtd: false,
        has_ann: false,
        dtd: null,

        // for the ann files
        ann_idx: null,
        anns: [],

        // for menu
        clicked_tag_id: null,

        // for file name filter
        fn_pattern: '',
    },

    vpp_methods: {
        download_xml: function() {

        },

        show_about: function() {

        },

        update_tag_table: function(tag) {
            console.log('* update tag table', tag);
        },
        
        open_files: function() {
            // the settings for annotation file
            var pickerOpts = {
                types: [
                    {
                        description: 'Annotation File',
                        accept: {
                            'text/*': ['.txt', '.xml']
                        }
                    },
                ],
                excludeAcceptAllOption: true,
                multiple: true
            };

            // get the file handles
            var promise_fileHandles = open_files(pickerOpts);

            promise_fileHandles.then(function(fileHandles) {
                // bind the content
                for (let i = 0; i < fileHandles.length; i++) {
                    const fh = fileHandles[i];
                    
                    // read the file
                    var p_ann = read_ann_file_handle(fh);
                    p_ann.then(function(ann) {
                        app_hotpot.set_ann(ann);
                    });
                    
                }
            });
        },

        set_ann_idx: function(idx) {
            app_hotpot.set_ann_idx(idx);
        },

        remove_ann_file: function(idx) {
            // delete this first
            this.anns.splice(idx, 1);

            if (idx == this.ann_idx) {
                app_hotpot.set_ann_idx(null);
            }
        },

        /////////////////////////////////////////////////////////////////
        // Menu Related
        /////////////////////////////////////////////////////////////////
        ctxmenu_add_tag: function(tag_def) {
            // get the basic tag
            var _tag = app_hotpot.cm_make_basic_tag_from_selection();

            // create a new tag
            var tag = app_hotpot.make_tag(_tag, tag_def, this.anns[this.ann_idx]);

            // add this tag to ann
            this.anns[this.ann_idx].tags.push(tag);

            // update the cm
            app_hotpot.cm_update_marks();

            // after 
            app_hotpot.ctxmenu_sel.hide();

            // scroll the view
            app_hotpot.scroll_annlist_to_bottom();
        },

        ctxmenu_close: function() {
            app_hotpot.ctxmenu_sel.hide();
        },

        popmenu_del_tag: function() {
            // delete the clicked tag id
            app_hotpot.remove_tag_from_ann(this.clicked_tag_id, this.anns[this.ann_idx]);

            // update the cm
            app_hotpot.cm_update_marks();

            // hide the menu 
            app_hotpot.popmenu_tag.hide();

            // reset the clicked tag id
            this.clicked_tag_id = null;
        },

        /////////////////////////////////////////////////////////////////
        // Other utils
        /////////////////////////////////////////////////////////////////
        count_n_tags: function(tag) {
            if (this.ann_idx == null) {
                return '';
            }
            var cnt = 0;
            if (tag == null) {
                return this.anns[this.ann_idx].tags.length;
            }
            for (let i = 0; i < this.anns[this.ann_idx].tags.length; i++) {
                if (this.anns[this.ann_idx].tags[i].tag == tag.name) {
                    cnt += 1;
                }
            }
            return cnt;
        },

        is_match_filename: function(fn) {
            let p = this.fn_pattern.trim();
            if (p == '') {
                return true;
            }
            if (fn.lastIndexOf(p) >= 0) {
                return true;
            } else {
                return false;
            }
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

    // the popup menu for tag
    popmenu_tag: null,

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
        this.vpp = new Vue({
            el: this.vpp_id,
            data: this.vpp_data,
            methods: this.vpp_methods,

            mounted: function () {
                Metro.init();
            },
        });

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
                lineWrapping: true,
                readOnly: true,
                styleActiveLine: true
            }
        );

        this.codemirror.on('contextmenu', function(inst, evt) {
            evt.preventDefault();

            // update the selection texts
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

        // update the shortcuts
        this.update_tag_shortcuts();

        // update the context menu
        this.update_tag_ctxmenu();

        // update the pop menu
        this.update_tag_popmenu();

        // force update
        this.vpp.$forceUpdate();
    },

    set_ann: function(ann, is_switch_to_this_ann) {
        console.log("* set ann", ann);
        this.vpp.$data.has_ann = true;
        this.vpp.$data.anns.push(ann);

        if (is_switch_to_this_ann || this.vpp.$data.anns.length == 1) {
            this.vpp.$data.ann_idx = this.vpp.$data.anns.length - 1;

            // update the text display
            this.codemirror.setValue(
                this.vpp.$data.anns[this.vpp.$data.ann_idx].text
            );
    
            // update the marks
            this.cm_update_marks();
        }
    },

    set_ann_idx: function(ann_idx) {
        console.log('* set ann_idx', ann_idx);

        // update the ann_idx
        this.vpp.$data.ann_idx = ann_idx;

        if (ann_idx == null) {
            // which means remove the content
            this.codemirror.setValue('');

            // update the marks
            this.cm_update_marks();
        } else {
            // update the text display
            this.codemirror.setValue(
                this.vpp.$data.anns[this.vpp.$data.ann_idx].text
            );

            // update the marks
            this.cm_update_marks();
        }
    },

    bind_events: function() {
        // bind drop zone for dtd
        this.bind_dropzone_dtd();

        // bind drop zone for anns
        this.bind_dropzone_ann();

        // bind global click event
        this.bind_click_event();

        // bind global key event
        this.bind_keypress_event();
    },

    bind_click_event: function() {
        document.getElementById('app_hotpot').addEventListener(
            "click",
            function(event) {
                console.log('* clicked on', event.target);

                var dom = event.target;
                var obj = $(dom);

                // show the menu
                var mouseX = event.clientX;
                var mouseY = event.clientY;

                // close the right click menu
                if (app_hotpot.ctxmenu_sel != null) {
                    app_hotpot.ctxmenu_sel.hide();
                }
                if (app_hotpot.popmenu_tag != null) {
                    app_hotpot.popmenu_tag.hide();
                }

                if (obj.hasClass('mark-tag-text')) {
                    // this is a mark in code mirror
                    var tag_id = dom.getAttribute('tag_id');

                    // set the clicked tag_id
                    app_hotpot.vpp.$data.clicked_tag_id = tag_id;

                    // show the menu
                    app_hotpot.show_tag_popmenu(mouseX, mouseY);
                } else {
                    // what to do?
                }
            }
        );
    },

    bind_keypress_event: function() {
        document.addEventListener(
            "keypress",
            function(event) {
                console.log('* pressed on', event);
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
            // if (items.length>1) {
            //     console.log('* selected more than 1 item!');
            //     return;
            // }

            for (let i=0; i<items.length; i++) {
                console.log(items[i]);
                // let item = items[i].webkitGetAsEntry();
                let item = items[i].getAsFileSystemHandle();
                item.then(function(fh) {
                    if (fh.kind == 'file') {
                        // show something?
                        // should be a ann txt/xml file
                        app_hotpot.parse_drop_ann(fh);

                    } else {
                        // so item is a fileEntry
                    }
                });
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

    parse_drop_ann: function(fh) {
        // get the ann file
        console.log('* ann file:', fh);
        var p_ann = read_ann_file_handle(fh);
        p_ann.then(function(ann) {
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
        $('#main_ui').css('height', h - 175);
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
        '#9c9c64',
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
                    ".mark-tag-" + tag_name + " { background-color: " + color + "; }",
                    0
                );
                style.insertRule(
                    ".fg-tag-" + tag_name + " { color: " + color + " !important; }",
                    0
                );

                // add this tag as the hint
                style.insertRule(
                    ".mark-tag-hint-" + tag_name + " { background-color: " + color + "66; }",
                    0
                );

                i += 1;
            }
        }
    },

    app_shortcuts: [
        '1',
        '2',
        '3',
        '4',
        '5',
        'q',
        'w',
        'e',
        'r',
        't',
        'a',
        's',
        'd',
        'f',
        'g',
        'z',
        'x',
        'c',
        'v',
        'b'
    ],

    update_tag_shortcuts: function() {
        for (let i = 0; i < this.vpp.dtd.etags.length; i++) {
            if (i < this.app_shortcuts.length) {
                this.vpp.dtd.etags[i].shortcut = this.app_shortcuts[i];
            }
        }
    },

    show_tag_ctxmenu: function(x, y) {
        console.log("* show ctx menu on ", x, y);
        this.ctxmenu_sel.css('left', (x + 10) + 'px')
            .css('top', y + 'px')
            .show('drop', {}, 200, null);
    },

    show_tag_popmenu: function(x, y) {
        console.log("* show pop menu on ", x, y);
        this.popmenu_tag.css('left', (x + 10) + 'px')
            .css('top', y + 'px')
            .show('drop', {}, 200, null);
    },

    update_tag_ctxmenu: function() {
        // update the context menu
        this.ctxmenu_sel = $('#ctxmenu_sel').menu({
            items: "> :not(.ui-widget-header)"
        });
    },

    update_tag_popmenu: function() {
        // update the pop menu
        this.popmenu_tag = $('#popmenu_tag').menu({
            items: "> :not(.ui-widget-header)"
        });
    },

    del_tag: function(tag_id, ann) {
        if (typeof(ann) == 'undefined') {
            ann = this.vpp.$data.anns[this.vpp.$data.ann_idx];
        }
        this.remove_tag_from_ann(tag_id, ann);

        // update the marks
        app_hotpot.cm_update_marks();
    },

    /////////////////////////////////////////////////////////////////
    // Tag Related
    /////////////////////////////////////////////////////////////////
    make_tag: function(basic_tag, tag_def, ann) {
        // first, add the tag name
        basic_tag['tag'] = tag_def.name;

        // find the id number
        var n = 0;
        for (let i = 0; i < ann.tags.length; i++) {
            if (ann.tags[i].tag == tag_def.name) {
                // get the id number of this tag
                var _id = parseInt(ann.tags[i].id.replace(tag_def.id_prefix, ''));
                if (_id >= n) {
                    n = _id + 1;
                }
            }
        }
        basic_tag['id'] = tag_def.id_prefix + n;

        // add other attr
        for (let i = 0; i < tag_def.attlists.length; i++) {
            const att = tag_def.attlists[i];

            if (att.name == 'spans') {
                // special rule for spans attr
            } else {
                // set the default value
                basic_tag[att.name] = att.default_value;
            }
        }

        return basic_tag;
    },
    
    remove_tag_from_ann: function(tag_id, ann) {
        var tag_idx = -1;
        for (let i = 0; i < ann.tags.length; i++) {
            if (ann.tags[i].id == tag_id) {
                tag_idx = i;
                break;
            }            
        }

        // delete the found tag idx
        if (tag_idx == -1) {
            // ???
        } else {
            ann.tags.splice(tag_idx, 1); 
        }

        return ann;
    },

    /////////////////////////////////////////////////////////////////
    // Code Mirror Related
    /////////////////////////////////////////////////////////////////
    cm_make_basic_tag_from_selection: function() {
        var locs = [];
        var txts = [];
        for (let i = 0; i < app_hotpot.selection.sel_locs.length; i++) {
            var sel_loc = app_hotpot.selection.sel_locs[i];
            var sel_txt = app_hotpot.selection.sel_txts[i];
            locs.push(
                app_hotpot._calc_range2spans(
                    sel_loc, 
                    this.vpp.$data.anns[this.vpp.$data.ann_idx].text
                )
            );
            txts.push(sel_txt);
        }
        
        // now push new ann
        var tag = {
            'spans': locs.join(','),
            'text': txts.join(' ... ')
        };

        return tag;
    },

    cm_update_marks: function() {
        // clear and add the markers
        for (let i = 0; i < this.marktexts.length; i++) {
            var marktext = this.marktexts[i];
            marktext.clear();
        }
        this.marktexts.slice(0, this.marktexts.length);

        if (this.vpp.$data.ann_idx == null) {
            // nothing to do for empty
            return;
        }

        // update the new marks
        var working_ann = this.vpp.$data.anns[this.vpp.$data.ann_idx];

        for (let i = 0; i < working_ann.tags.length; i++) {
            var tag = working_ann.tags[i];
            this.cm_mark_obj_in_text(tag, working_ann.text);
        }

        this.vpp.$forceUpdate();
    },

    cm_mark_obj_in_text: function(tag, text) {
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


            // the second step is to enhance the mark tag with more info
            var markHTML = [
                '<span class="mark-tag mark-tag-'+tag.tag+'" id="mark-id-'+tag.id+'">',
                '<span class="mark-tag-info">',
                    '<span class="mark-tag-info-inline fg-tag-'+tag.tag+'">',
                    tag.id,
                    '</span>',
                '</span>',
                '<span class="mark-tag-text" tag_id="'+tag.id+'">',
                tag.text,
                '</span>',
                '<span class="mark-tag-info-offset" title="Delete tag '+tag.id+'" onclick="app_hotpot.del_tag(\''+tag.id+'\');">',
                    '<i class="fa fa-times-circle"></i>',
                '</span>',
                '</span>'
            ].join('');

            // convert this HTML to DOMElement
            var placeholder = document.createElement('div');
            placeholder.innerHTML = markHTML;
            var markNode = placeholder.firstElementChild;

            // add mark to text
            this.marktexts.push(this.codemirror.markText(
                {line: ln0, ch: ch0},
                {line: ln1, ch: ch1},
                {
                    className: 'mark-tag mark-tag-' + tag.tag,
                    replacedWith: markNode
                }
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

    scroll_annlist_to_bottom: function() {
        var objDiv = document.getElementById("mui_annlist");
        objDiv.scrollTop = objDiv.scrollHeight;
    }
};