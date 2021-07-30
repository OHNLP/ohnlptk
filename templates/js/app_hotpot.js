var app_hotpot = {
    // metro app toast
    metro_toast: Metro.toast.create,

    // vue app
    vpp: null,
    vpp_id: '#app_hotpot',

    vpp_data: {
        // for the section control
        section: 'annotation',

        // for the dtd
        dtd: null,

        // for the ann files
        ann_idx: null,
        anns: [],

        // for the hints of current ann
        hints: [],

        // for all hints of all anns
        hint_dict: {},

        // for popmenu
        clicked_tag_id: null,

        // for converting the txt to xmls
        txt_anns: [],
        txt_xmls: [],
        txt_xml_prefix: '',
        txt_xml_suffix: '',

        // for file name filter
        fn_pattern: '',

        // cm settings
        cm: {
            // node / span
            mark_mode: 'node',

            // simple / smart / off
            hint_mode: 'simple',

            // for updating the codemirror instance
            is_expire: false
        }
    },

    vpp_methods: {
        /////////////////////////////////////////////////////////////////
        // Annotation section related functions
        /////////////////////////////////////////////////////////////////

        save_xml: function() {
            // convert to xml
            var xmlDoc = ann_parser.ann2xml(this.anns[this.ann_idx]);

            // convert to text
            var xmlStr = ann_parser.xml2str(xmlDoc, false);

            // save it!
            var p_rst = fs_write_ann_file(
                this.anns[this.ann_idx]._fh,
                xmlStr
            );

            p_rst.then(function(fh) {
                // in fact, please make sure the file is saved correctly
                app_hotpot.vpp.callback_save_xml(fh);
            })
            .catch(function(error) {
                console.log('* error when save xml', error);
            });;
        },

        callback_save_xml: function(fh) {
            // update the status
            this.anns[this.ann_idx]._has_saved = true;

            // show something
            app_hotpot.toast('Successfully saved ' + fh.name);
        },
        
        save_as_xml: function() {
            // convert to xml
            var xmlDoc = ann_parser.ann2xml(this.anns[this.ann_idx]);

            // convert to text
            var xmlStr = ann_parser.xml2str(xmlDoc, false);

            // get the current file name
            var fn = this.anns[this.ann_idx]._fh.name;

            // create a new name for suggestion
            var new_fn = 'copy_of_' + fn;

            // ask for new fh for this file
            var p_fh = get_new_ann_file_handle(new_fn);

            // when new fh is ready, save it
            p_fh.then((function(xmlStr){
                return function(fh) {
                    // save this xmlStr with the given fh
                    let p_done = fs_write_ann_file(
                        fh,
                        xmlStr
                    );

                    // show something when saved
                    p_done.then(function(fh) {
                        app_hotpot.toast('Successfully saved as ' + fh.name);
                    });
                }
            })(xmlStr))
            .catch(function(error) {
                console.log('* error when save as xml', error);
            });
        },

        save_as_json: function() {
        },

        show_about: function() {

        },

        open_dtd_file: function() {
            // the settings for dtd file
            var pickerOpts = {
                types: [
                    {
                        description: 'DTD File',
                        accept: {
                            'text/dtd': ['.dtd']
                        }
                    },
                ],
                excludeAcceptAllOption: true,
                multiple: false
            };

            // get the file handles
            var promise_fileHandles = fs_open_files(pickerOpts);

            promise_fileHandles.then(function(fileHandles) {
                // read the fh and set dtd
                // in fact, there is only one file for this dtd
                for (let i = 0; i < fileHandles.length; i++) {
                    const fh = fileHandles[i];

                    // read the file
                    var p_dtd = fs_read_dtd_file_handle(fh);

                    p_dtd.then(function(dtd) {
                        app_hotpot.set_dtd(dtd);
                    });
                }
            });
        },
        
        open_ann_files: function() {
            // the settings for annotation file
            var pickerOpts = {
                types: [
                    {
                        description: 'Annotation File',
                        accept: {
                            'text/xml': ['.xml']
                        }
                    },
                ],
                excludeAcceptAllOption: true,
                multiple: true
            };

            // get the file handles
            var promise_fileHandles = fs_open_files(pickerOpts);

            promise_fileHandles.then(function(fileHandles) {
                // bind the content
                for (let i = 0; i < fileHandles.length; i++) {
                    const fh = fileHandles[i];

                    // check exists
                    if (app_hotpot.vpp.has_included_ann_file(fh.name)) {
                        // exists? skip this file
                        app_hotpot.msg('Skipped same name or duplicated ' + fh.name);
                        return;
                    }
                    
                    // parse this ann fh
                    app_hotpot.parse_ann_file_fh(fh);
                }
            });
        },

        update_tag_table: function(tag) {
            console.log('* update tag table', tag);
        },

        set_ann_idx: function(idx) {
            console.log('* set ann_idx', idx);

            // update the ann_idx
            this.ann_idx = idx;

            if (idx == null) {
                // which means remove the content
                app_hotpot.codemirror.setValue('');

                // update the marks
                app_hotpot.cm_update_marks();

            } else {
                // update the text display
                app_hotpot.codemirror.setValue(
                    this.anns[this.ann_idx].text
                );

                // update the marks
                app_hotpot.cm_update_marks();
            }
        },

        show_ann_file: function(fn) {
            // first, find the ann_idx
            var idx = this.fn2idx(fn);

            if (idx < 0) {
                // no such file
                app_hotpot.toast('Not found ' + fn + ' file', 'bg-yellow');
                return;
            }

            // then switch to annotation
            this.switch_mui('annotation');

            // then show the idx
            this.set_ann_idx(idx);

            // trick for cm late update
            this.cm.is_expire = true;
        },

        fn2idx: function(fn) {
            for (let i = 0; i < this.anns.length; i++) {
                if (this.anns[i]._fh.name == fn) {
                    return i;
                }                
            }
            return -1;
        },

        remove_ann_file: function(idx) {
            // delete this first
            this.anns.splice(idx, 1);

            // once the file is removed, update the hint_dict
            app_hotpot.update_hint_dict_by_anns();

            if (idx == this.ann_idx) {
                this.set_ann_idx(null);
            }
        },

        remove_all_ann_files: function() {
            var ret = window.confirm('Are you sure to remove all annotation files?');
            if (ret) {
                this.set_ann_idx(null);
                this.anns = [];
            }
        },

        on_change_attr_value: function(event) {
            // just mark current ann as unsaved
            this.anns[this.ann_idx]._has_saved = false;
            console.log('* changed attr in', event.target);
        },

        on_input_attr_value: function(event) {
            // just mark current ann as unsaved
            this.anns[this.ann_idx]._has_saved = false;
            console.log('* changed input attr to', event.target.value);
        },

        on_change_mark_mode: function(event) {
            console.log(event.target.value);
            app_hotpot.cm_update_marks();
        },

        on_change_hint_mode: function(hint_mode) {
            this.cm.hint_mode = hint_mode;

            app_hotpot.cm_update_marks();
        },

        get_hint: function(hint_id) {
            for (let i = 0; i < this.hints.length; i++) {
                if (this.hints[i].id == hint_id) {
                    return this.hints[i];
                }
            }
            return null;
        },

        add_tag_by_hint: function(hint_id, tag_name) {
            // get the hint from list 
            var hint = this.get_hint(hint_id);
            if (hint == null) { return; }

            // convert the range to spans
            var spans = hint.loc[0] + '~' + hint.loc[1];

            // createa new ann tag
            var _tag = {
                'spans': spans,
                'text': hint.text
            }
            var tag_def = this.dtd.tag_dict[tag_name];
            
            // create a new tag
            var tag = app_hotpot.make_tag(_tag, tag_def, this.anns[this.ann_idx]);

            // add this tag to ann
            this.anns[this.ann_idx].tags.push(tag);

            // mark _has_saved
            this.anns[this.ann_idx]._has_saved = false;
            console.log('* added tag by hint, ' + tag_name + ' on ' + hint.text);

            // update the hint_dict
            app_hotpot.update_hint_dict_by_tag(
                this.anns[this.ann_idx],
                tag
            );

            // update the cm
            app_hotpot.cm_update_marks();

            // scroll the view
            app_hotpot.scroll_annlist_to_bottom();

        },

        add_tag_by_ctxmenu: function(tag_def) {

            // get the basic tag
            var _tag = app_hotpot.cm_make_basic_tag_from_selection();

            // then call the general add_tag process
            this.add_tag(_tag, tag_def);

            // clear the selection to avoid stick keys
            app_hotpot.cm_clear_selection();

            // for ctxmenu, we need to remove the ctx after click
            app_hotpot.ctxmenu_sel.hide();

            // scroll the view
            app_hotpot.scroll_annlist_to_bottom();

            console.log('* added tag by right click, ' + tag_def.name);
        },

        add_tag_by_shortcut_key: function(key) {
            // first, get selection
            var selection = app_hotpot.cm_get_selection();
            if (selection.sel_txts == '') {
                // nothing selected for tag, skip
                return;
            }

            // then get the tag_def by the given key
            var tag_def = null;
            for (let i = 0; i < this.dtd.etags.length; i++) {
                if (this.dtd.etags[i].shortcut == key) {
                    // found!
                    tag_def = this.dtd.etags[i];
                    break
                }
            }
            if (tag_def == null) {
                // oh, this shortcut is not registered
                return;
            }

            // get a basic tag
            var _tag = app_hotpot.cm_make_basic_tag_from_selection();

            // then call the general add_tag process
            this.add_tag(_tag, tag_def);

            // clear the selection to avoid stick keys
            app_hotpot.cm_clear_selection();

            console.log('* added tag by shortcut, ' + tag_def.name + ' on ' + _tag.text);
        },

        add_tag: function(basic_tag, tag_def) {
            // create a new tag
            var tag = app_hotpot.make_tag(basic_tag, tag_def, this.anns[this.ann_idx]);

            // add this tag to ann
            this.anns[this.ann_idx].tags.push(tag);

            // mark _has_saved
            this.anns[this.ann_idx]._has_saved = false;

            // add this new tag to hint_dict
            app_hotpot.update_hint_dict_by_tag(this.anns[this.ann_idx], tag);

            // update the cm
            app_hotpot.cm_update_marks();
        },

        del_tag: function(tag_id) {
            // delete the clicked tag id
            app_hotpot.del_tag(
                tag_id, this.anns[this.ann_idx]
            );
        },
        
        /////////////////////////////////////////////////////////////////
        // Corpus menu related functions
        /////////////////////////////////////////////////////////////////

        clear_corpus_all: function() {
            this.txt_anns = [];
            this.txt_xmls = [];
        },

        open_txt_files: function() {
            // the settings for raw text file
            var pickerOpts = {
                types: [
                    {
                        description: 'Raw Text File',
                        accept: {
                            'text/txt': ['.txt']
                        }
                    },
                ],
                excludeAcceptAllOption: true,
                multiple: true
            };

            // get the file handles
            var promise_fileHandles = fs_open_files(pickerOpts);

            promise_fileHandles.then(function(fileHandles) {
                // bind the content
                for (let i = 0; i < fileHandles.length; i++) {
                    const fh = fileHandles[i];

                    // check exists
                    if (app_hotpot.vpp.has_included_txt_ann_file(fh.name)) {
                        // exists? skip this file
                        return;
                    }
                    
                    // read the file
                    var p_txt_ann = fs_read_txt_file_handle(fh);
                    p_txt_ann.then(function(txt_ann) {
                        app_hotpot.vpp.add_txt(txt_ann);
                    });
                    
                }
            });
        },

        add_txt: function(txt_ann) {
            // update the dtd name here
            txt_ann.dtd_name = this.dtd.name;
    
            // put this to the list
            this.txt_anns.push(txt_ann);
        },

        convert_txt_anns_to_xmls: function() {
            // clear the current txt_xmls
            this.txt_xmls = [];

            for (let i = 0; i < this.txt_anns.length; i++) {
                const txt_ann = this.txt_anns[i];
                
                // create new filename
                var fn = txt_ann._fh.name;

                // get the xml string
                var xml = ann_parser.ann2xml(txt_ann);
                var str = ann_parser.xml2str(xml);

                // create an object for display
                var txt_xml = {
                    fn: fn,
                    text: str
                };

                this.txt_xmls.push(txt_xml);
            }
        },

        get_new_xml_filename: function(fn, ext='.xml') {
            var prefix = this.txt_xml_prefix.trim();
            var suffix = this.txt_xml_suffix.trim();
            var new_fn = fn;

            // add prefix
            if (prefix == '') {
                // nothing to do
            } else {
                new_fn = prefix + '_' + new_fn;
            }

            // add suffix
            if (suffix == '') {
                // nothing to do
                new_fn = new_fn + ext;
            } else {
                new_fn = new_fn + '_' + suffix + ext;
            }

            return new_fn;
        },

        get_new_xmls_zipfile_folder_name: function() {
            var fn = this.dtd.name + '-' + this.txt_anns.length;
            fn = this.get_new_xml_filename(fn, '');
            return fn + '-xmls';
        },

        download_txt_xml: function(txt_ann_idx) {
            var txt_xml = this.txt_xmls[txt_ann_idx];
            var fn = this.get_new_xml_filename(txt_xml.fn);
            var blob = new Blob([txt_xml.text], {type: "text/xml;charset=utf-8"});
            saveAs(blob, fn);
        },

        download_txt_xmls_as_zip: function() {
            // create an empty zip pack
            var zip = new JSZip();
            var folder_name = this.get_new_xmls_zipfile_folder_name();

            // add files to zip pack
            for (let i = 0; i < this.txt_xmls.length; i++) {
                const txt_xml = this.txt_xmls[i];
                var fn = this.get_new_xml_filename(txt_xml.fn);
                var ffn = folder_name + '/' + fn;

                // add to zip
                zip.file(ffn, txt_xml.text);
                
                console.log('* added xml file ' + fn);
            }

            // create zip file
            zip.generateAsync({ type: "blob" }).then(function (content) {
                saveAs(content, app_hotpot.vpp.get_new_xmls_zipfile_folder_name() + '.zip');
            });
        },

        /////////////////////////////////////////////////////////////////
        // Ruleset Related
        /////////////////////////////////////////////////////////////////

        update_hint_dict: function() {
            app_hotpot.update_hint_dict_by_anns();
        },

        get_ruleset_base_name: function() {
            var fn = this.dtd.name + '-' + this.anns.length;
            return fn;
        },

        download_ruleset_medtagger_zip: function() {
            erp_toolkit.download_anns_as_zip(
                this.anns,
                this.dtd,
                'ruleset-medtagger-' + this.get_ruleset_base_name() + '.zip'
            );
        },

        download_ruleset_spacy_jsonl: function() {
            spacy_toolkit.download_anns_as_jsonl(
                this.anns,
                this.dtd,
                'ruleset-spacy-' + this.get_ruleset_base_name() + '.jsonl'
            );
        },

        /////////////////////////////////////////////////////////////////
        // Menu Related
        /////////////////////////////////////////////////////////////////
        switch_mui: function(section) {
            console.log('* switch to section', section);
            this.section = section;

            if (section == 'annotation') {
                // refresh the code mirror
                this.set_ann_idx(this.ann_idx);
            }

            app_hotpot.resize();
        },

        close_ctxmenu: function() {
            app_hotpot.ctxmenu_sel.hide();
        },

        close_popmenu: function() {
            app_hotpot.popmenu_tag.hide();
        },

        popmenu_del_tag: function() {
            // delete the clicked tag id
            app_hotpot.del_tag(
                this.clicked_tag_id, this.anns[this.ann_idx]
            );

            // hide the menu 
            app_hotpot.popmenu_tag.hide();

            // reset the clicked tag id
            this.clicked_tag_id = null;
        },

        /////////////////////////////////////////////////////////////////
        // Other utils
        /////////////////////////////////////////////////////////////////
        make_html_bold_tag_name: function(tag) {
            var html = '<span class="tag-list-row-name-id-prefix">' + tag.id_prefix + '</span>';
            var name = tag.name;
            name = name.replace(tag.id_prefix, '');
            html = html += name;
            return html;
        },

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

        count_all_tags: function(anns) {
            var n = 0;
            for (let i = 0; i < anns.length; i++) {
                for (let j = 0; j < anns[i].tags.length; j++) {
                    n += 1;
                }
            }
            return n;
        },

        calc_avg_tags_per_doc: function(anns) {
            if (anns == null || anns.length == 0) {
                return '-';
            }
            var t = this.count_all_tags(anns);
            return (t/anns.length).toFixed(2);
        },

        calc_avg_tags_per_def: function(anns, dtd) {
            if (anns == null || anns.length == 0) {
                return '-';
            }
            if (dtd == null || dtd.etags.length == 0) {
                return '-';
            }
            return (anns.length / dtd.etags.length).toFixed(2);
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
        },

        has_included_ann_file: function(fn) {
            for (let i = 0; i < this.anns.length; i++) {
                if (this.anns[i]._fh.name == fn) {
                    return true;
                }
            }

            return false;
        },

        has_included_txt_ann_file: function(fn) {
            for (let i = 0; i < this.txt_anns.length; i++) {
                if (this.txt_anns[i]._fh.name == fn) {
                    return true;
                }
            }

            return false;
        },

        has_unsaved_ann_file: function() {
            for (let i = 0; i < this.anns.length; i++) {
                const ann = this.anns[i];
                if (ann._has_saved) {

                } else {
                    return true;
                }
            }
            return false;
        },

        get_tag_def: function(tag_name) {
            if (this.dtd.tag_dict.hasOwnProperty(tag_name)) {
                return this.dtd.tag_dict[tag_name];
            } else {
                return null;
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

    init: function() {
        this.vpp = new Vue({
            el: this.vpp_id,
            data: this.vpp_data,
            methods: this.vpp_methods,

            mounted: function() {
                Metro.init();
            },

            updated: function() {
                this.$nextTick(function () {
                    // Code that will run only after the
                    // entire view has been re-rendered
                    if (this.section == 'annotation') {
                        if (this.cm.is_expire) {
                            this.set_ann_idx(this.ann_idx);
                            this.cm.is_expire = false;
                        }
                    }
                });
            }
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
            var selection = app_hotpot.cm_get_selection(inst);
            if (selection.sel_txts == '') {
                // nothing selected for tag, skip
                return;
            }
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
     */
    set_dtd: function(dtd) {
        console.log('* set dtd', dtd);
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

    add_ann: function(ann, is_switch_to_this_ann) {
        // check the schema first
        if (ann.dtd_name != this.vpp.$data.dtd.name) {
            console.log('* skip unmatched ann', ann);
            app_hotpot.msg('Skipped unmatched file ' + ann._fh.name, 'warning');
            return;
        }

        this.vpp.$data.anns.push(ann);

        // update hint_dict when add new ann file
        this.update_hint_dict_by_anns();

        if (is_switch_to_this_ann || this.vpp.$data.anns.length == 1) {
            this.vpp.$data.ann_idx = this.vpp.$data.anns.length - 1;

            // update the text display
            this.codemirror.setValue(
                this.vpp.$data.anns[this.vpp.$data.ann_idx].text
            );
    
            // update the marks
            this.cm_update_marks();
        }
        console.log("* added ann", ann);
    },

    /////////////////////////////////////////////////////////////////
    // Events related
    /////////////////////////////////////////////////////////////////

    bind_events: function() {
        // bind drop zone for dtd
        this.bind_dropzone_dtd();

        // bind drop zone for anns
        this.bind_dropzone_ann();

        // bind drop zone for anns
        this.bind_dropzone_txt();

        // bind global click event
        this.bind_click_event();

        // bind global key event
        this.bind_keypress_event();

        // bind the closing event
        this.bind_unload_event();
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

                // first, check if there is any selection
                app_hotpot.vpp.add_tag_by_shortcut_key(
                    event.key.toLocaleLowerCase()
                );
            }
        );
    },

    bind_unload_event: function() {
        window.addEventListener('beforeunload', function (event) {
            if (app_hotpot.vpp.has_unsaved_ann_file()) {
                event.preventDefault();
                var msg = 'There are unsaved annotation files, are you sure to leave them unsaved?';
                event.returnValue = msg;
                return msg;
            }
        });
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
            // prevent the default download event
            event.preventDefault();
            
            let items = event.dataTransfer.items;
            for (let i=0; i<items.length; i++) {
                // console.log(items[i]);
                
                // get this item as a FileSystemHandle Object
                // this could be used for saving the content back
                // let item = items[i].webkitGetAsEntry();
                let item = items[i].getAsFileSystemHandle();

                // read this handle
                item.then(function(fh) {
                    if (fh.kind == 'file') {
                        // show something or 
                        // check if this file name exists
                        if (app_hotpot.vpp.has_included_ann_file(fh.name)) {
                            // exists? skip this file
                            app_hotpot.msg('Skipped same name or duplicated ' + fh.name);
                            return;
                        }

                        // should be a ann txt/xml file
                        app_hotpot.parse_ann_file_fh(fh);

                    } else {
                        // so item is a directory?
                    }
                });
            }

        }, false);

    },

    bind_dropzone_txt: function() {
        let dropzone = document.getElementById("dropzone_txt");

        dropzone.addEventListener("dragover", function(event) {
            event.preventDefault();
        }, false);

        dropzone.addEventListener("drop", function(event) {
            let items = event.dataTransfer.items;
            // stop the download event
            event.preventDefault();

            for (let i=0; i<items.length; i++) {
                // let item = items[i].webkitGetAsEntry();
                let item = items[i].getAsFileSystemHandle();
        
                item.then(function(fh) {
                    if (fh.kind == 'file') {
                        // check exists
                        if (app_hotpot.vpp.has_included_txt_ann_file(fh.name)) {
                            // exists? skip this file
                            return;
                        }

                        // read the file
                        var p_txt_ann = fs_read_txt_file_handle(fh);
                        p_txt_ann.then(function(txt_ann) {
                            app_hotpot.vpp.add_txt(txt_ann);
                        });
                        
                    } else {
                        // what to do with a directory
                    }
                })
                .catch(function(error) {
                    console.log('* error when drop txt', error);
                });
            }

        }, false);
    },

    resize: function() {
        var h = $(window).height();
        $('.main-ui').css('height', h - 145);
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

    parse_ann_file_fh: function(fh) {
        // get the ann file
        var p_ann = fs_read_ann_file_handle(fh);
        p_ann.then(function(ann) {
            app_hotpot.add_ann(ann);
        });
    },

    read_file_async: function(fileEntry, callback) {
        fileEntry.file(function(file) {
            let reader = new FileReader();
            reader.onload = callback;
            reader.readAsText(file)
        });
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
        '#9654dc',
        '#d0aa3d',
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
                    ".border-tag-" + tag_name + " { border-color: " + color + " !important; }",
                    0
                );
                style.insertRule(
                    ".fg-tag-" + tag_name + " { color: " + color + " !important; }",
                    0
                );

                // add this tag as the hint
                style.insertRule(
                    ".mark-hint-" + tag_name + ":hover { background-color: " + color + "; }",
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
                // assign a key to this etag
                this.vpp.dtd.etags[i].shortcut = this.app_shortcuts[i];
                
                // now, we need to update the tag_dict
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

        // mark _has_saved
        this.vpp.$data.anns[this.vpp.$data.ann_idx]._has_saved = false;
        console.log('* deleted tag ' + tag_id);

        // update the marks
        app_hotpot.cm_update_marks();

        // toast
        app_hotpot.toast(
            'Successfully deleted tag ' + tag_id,
            ''
        );
    },

    update_hint_dict_by_anns: function() {
        if (this.vpp.$data.anns.length == 0) {
            this.vpp.hint_dict = {};
            return;
        }
        var hint_dict = ann_parser.anns2hint_dict(
            this.vpp.$data.dtd, 
            this.vpp.$data.anns
        );
        this.vpp.hint_dict = hint_dict;
        console.log('* updated hint_dict by anns', this.vpp.hint_dict);
    },

    update_hint_dict_by_tag: function(ann, tag) {
        this.vpp.hint_dict = ann_parser.add_tag_to_hint_dict(
            ann, tag, this.vpp.hint_dict
        );
        console.log('* updated hint_dict by tag', this.vpp.hint_dict, tag);
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
    cm_get_selection: function(inst) {
        if (typeof(inst) == 'undefined') {
            inst = this.codemirror;
        }
        // update the selection
        var selection = {
            sel_txts: inst.getSelections(),
            sel_locs: inst.listSelections()
        };
        this.selection = selection;
        console.log("* found selection:", app_hotpot.selection);
        return selection;
    },

    cm_clear_selection: function(to_anchor=true) {
        var new_anchor = null;
        if (to_anchor) {
            new_anchor = this.selection.sel_locs[0].anchor;
        } else {
            new_anchor = this.selection.sel_locs[0].head;
        }
        this.codemirror.setSelection(new_anchor);
    },

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
        
        // now push new ann tag
        var tag = {
            'spans': locs.join(','),
            'text': txts.join(' ... ')
        };

        return tag;
    },

    cm_update_marks: function() {
        // clear and add the markers
        var marks = this.codemirror.getAllMarks();
        for (let i = 0; i < marks.length; i++) {
            marks[i].clear();
        }

        // update the tag marks
        this.cm_update_tag_marks();

        // update the hint marks
        this.cm_update_hint_marks();

        // force update UI, well ... maybe not work
        this.vpp.$forceUpdate();
    },

    cm_update_hint_marks: function() {
        if (this.vpp.$data.ann_idx == null) {
            // nothing to do for empty
            return;
        }

        if (this.vpp.$data.cm.hint_mode == 'off') {
            // nothing to do when turn off hint
            return;
        }

        if (this.vpp.$data.dtd == null) {
            // nothing to do if no dtd given
            return;
        }

        // find markable hints for this ann
        var hints = ann_parser.search_hints_in_ann(
            this.vpp.hint_dict,
            this.vpp.$data.anns[this.vpp.$data.ann_idx]
        );
        console.log('* found hints', hints);

        // bind the hints to vpp
        this.vpp.$data.hints = hints;

        for (let i = 0; i < hints.length; i++) {
            const hint = hints[i];
            this.cm_mark_hint_str(hint);
        }
    },

    cm_update_tag_marks: function() {
        if (this.vpp.$data.ann_idx == null) {
            // nothing to do for empty
            return;
        }

        // update the new marks
        var working_ann = this.vpp.$data.anns[this.vpp.$data.ann_idx];

        for (let i = 0; i < working_ann.tags.length; i++) {
            var tag = working_ann.tags[i];
            var tag_def = this.vpp.get_tag_def(tag.tag);
            this.cm_mark_ann_tag_in_text(tag, tag_def, working_ann.text);
        }
    },

    /**
     * Mark the hint in the code mirror
     * @param {object} hint it contains the range for rendering
     */
    cm_mark_hint_str: function(hint) {
        var ln0 = hint.range[0][0];
        var ch0 = hint.range[0][1];
        var ln1 = hint.range[1][0];
        var ch1 = hint.range[1][1];
        
        if (this.vpp.$data.cm.mark_mode == 'node') {
            var hint_tag_id_prefix = dtd_parser.get_id_prefix(
                hint.tag, 
                this.vpp.$data.dtd
            );
            var markHTML = [
                '<span class="mark-hint mark-hint-'+hint.tag+'" id="mark-id-'+hint.id+'" onclick="app_hotpot.vpp.add_tag_by_hint(\''+hint.id+'\', \''+hint.tag+'\')" title="Click to add this to tags">',
                '<span class="mark-hint-info mark-tag-'+hint.tag+'">',
                    hint_tag_id_prefix,
                '</span>',
                '<span class="mark-hint-text" hint_id="'+hint.id+'">',
                    hint.text,
                '</span>',
                '<span class="mark-hint-tooltip">',
                    hint.tag,
                '</span>',
                '</span>'
            ].join('');

            // convert this HTML to DOMElement
            var placeholder = document.createElement('div');
            placeholder.innerHTML = markHTML;
            var markNode = placeholder.firstElementChild;

            this.codemirror.markText(
                {line: ln0, ch: ch0},
                {line: ln1, ch: ch1},
                {
                    className: 'mark-hint mark-hint-' + hint.tag,
                    replacedWith: markNode,
                    attributes: {
                        hint_id: hint.id
                    }
                }
            );
        } else if (this.vpp.$data.cm.mark_mode == 'span') {
            this.codemirror.markText(
                {line: ln0, ch: ch0},
                {line: ln1, ch: ch1},
                {
                    className: 'mark-hint mark-hint-' + hint.tag,
                    attributes: {
                        hint_id: hint.id,
                        onclick: ''
                    }
                }
            );
        }
    },

    cm_mark_ann_tag_in_text: function(tag, tag_def, text) {
        if (tag_def.type == 'etag') {
            this.cm_mark_ann_etag_in_text(tag, tag_def, text);
        } else {
            this.cm_mark_ann_ltag_in_text(tag, tag_def, text);
        }
    },

    cm_mark_ann_ltag_in_text: function(tag, tag_def, text) {
    },

    cm_mark_ann_etag_in_text: function(tag, tag_def, text) {
        var raw_spans = tag['spans'];
        if (raw_spans == '' || raw_spans == null) { 
            return [-1]; 
        }

        // the spans may contains multiple parts
        // split them first
        var spans_arr = raw_spans.split(',');
        var text_arr = tag.text.split('...');
        
        for (let i = 0; i < spans_arr.length; i++) {
            const spans = spans_arr[i];
            const spans_text = text_arr[i];
            var rst = this._calc_spans2range(spans, text);
            var ln0 = rst[0][0];
            var ch0 = rst[0][1];
            var ln1 = rst[1][0];
            var ch1 = rst[1][1];

            if (this.vpp.$data.cm.mark_mode == 'node') {
                // the second step is to enhance the mark tag with more info
                var markHTML = [
                    '<span class="mark-tag mark-tag-'+tag.tag+'" id="mark-id-'+tag.id+'">',
                    '<span class="mark-tag-info">',
                        '<span class="mark-tag-info-inline fg-tag-'+tag.tag+'">',
                        tag.id,
                        '</span>',
                    '</span>',
                    '<span class="mark-tag-text" tag_id="'+tag.id+'">',
                        spans_text,
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
                this.codemirror.markText(
                    {line: ln0, ch: ch0},
                    {line: ln1, ch: ch1},
                    {
                        className: 'mark-tag mark-tag-' + tag.tag,
                        replacedWith: markNode,
                        attributes: {
                            tag_id: tag.id
                        }
                    }
                );

            } else if (this.vpp.$data.cm.mark_mode == 'span') {
                this.codemirror.markText(
                    {line: ln0, ch: ch0},
                    {line: ln1, ch: ch1},
                    {
                        className: 'mark-tag mark-tag-' + tag.tag,
                        attributes: {
                            tag_id: tag.id,
                            onclick: ''
                        }
                    }
                );
            }
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
    },
    
    /////////////////////////////////////////////////////////////////
    // Utils
    /////////////////////////////////////////////////////////////////
    toast: function(msg, cls, timeout) {
        if (typeof(cls) == 'undefined') {
            cls = '';
        }
        if (typeof(timeout) == 'undefined') {
            timeout = 3000;
        }
        var options = {
            showTop: true,
            timeout: timeout,
            clsToast: cls
        };
        this.toast(msg, null, null, null, options);
    },

    msg: function(msg, cls) {
        if (typeof(cls) == 'undefined') {
            cls = 'info';
        }
        msg = '<i class="fa fa-info-circle"></i> ' + msg; 
        var notify = Metro.notify;
        notify.setup({
            width: 300,
            timeout: 3000,
            animation: 'swing'
        });
        notify.create(msg, null, { 
            cls: cls
        });
    }
};