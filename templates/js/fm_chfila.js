var fm_chfila = {
    vpp: null,
    vpp_id: '#fm_chfila',
    rulepack: null,

    hosts: {
        localtest: {
            name: 'Localhost Test Server',
            host: 'http://localhost:8080'
        },
        ohnlp4covid_dev: {
            name: 'OHNLP COVID Dev Server',
            host: 'https://ohnlp4covid-dev.n3c.ncats.io'
        },
        ohnlp_az_dev: {
            name: 'OHNLP Azure Server',
            host: 'https://ohnlp4covid-dev.n3c.ncats.io'
        },
        current: {
            name: 'Current UI Server',
            host: ''
        }
    },

    static_url: {
        sample: './static/data/covid19.json'
    },

    url: {
        parse: '/parse',
        get_rulepack_list: '/get_rulepack_list',
        get_rulepack: '/get_rulepack',
        del_rulepack: '/del_rulepack',
        save_rulepack: '/save_rulepack',
        ie_editor_test: '/ie_editor_test'
    },

    get_url: function(url, host) {
        if (typeof(host) == 'undefined') {
            host = 'localtest';
        }
        return this.hosts[host].host + url;
    },

    rp: {
        state: {
            NEW: 'new',
            SAVED: 'saved',
            SAVING: 'saving',
            UNSAVED: 'unsaved'
        },
        prefix: {
            rsregexp: 'resources_regexp_re'
        }
    },

    sample: {
        name: 'rule_pack_name',
        matchrules: [{
            rule_name: 'rule_r1a',
            regexp: '\\b(rule|pack|name)\\b',
            location: 'NA',
            norm: 'ANT:group(1)'
        }, {
            rule_name: 'rule_r2a',
            regexp: '\\b(rule|pack|name)\\b',
            location: 'UC',
            norm: 'NAT:group(1)'
        }],
        rsregexps: [{
            name: 'resources_regexp_reBURG',
            text: 'pattern(s)?\nnextline\n3rd line'
        }, {
            name: 'resources_regexp_reBURGAlone',
            text: 'pattern(s)?\nnextline\n3rd line'
        }],
        contexts: [{
            name: 'contextRule',
            text: 'regex:(^|\s)\?(?=\s?\w+)~|~pre~|~poss~|~1\ndoes not demonstrate~|~pre~|~neg~|~1\ndid not demonstrate~|~pre~|~neg~|~1\ndo not demonstrate~|~pre~|~neg~|~1'
        }],
        fns: {
            used_resources: 'used_resources.txt',
            resources_rules_matchrules: 'resources_rules_matchrules.txt'
        }
    },

    get_current_rulepack: function() {
        if (this.vpp.$data.ui.mode == 'full') {
            return this.vpp.$data.rulepack;
        } else {
            return this.easypack2rulepack(
                this.vpp.$data.easypack
            );
        }
    },

    init: function () {
        // update the current host
        this.hosts.current.host = location.protocol + '//' + location.hostname;

        // init the vpp
        this.vpp = new Vue({
            el: this.vpp_id,
            data: {
                // the current rule pack
                rulepack: fm_chfila.create_new_rulepack(),

                // for db
                rulepack_id: null,

                // status for alert user
                rulepack_state: fm_chfila.rp.state.UNSAVED,

                // the rulepacks for current project
                rulepacks: [],

                // for the UI
                ui: {
                    locations: ['NA', 'UC'],

                    // mode for the UI
                    mode: 'easy',
                    enable_context: false,
                },
                
                // simple rulecard
                easypack: fm_chfila.create_new_easypack()
            },

            methods: {

                ///////////////////////////////////////////////////////////////
                // Ribbon menu functions
                ///////////////////////////////////////////////////////////////

                switch_mode: function(mode) {
                    this.ui.mode = mode;
                    if (mode == 'easy') {
                        // switch to easy mode
                        this.easypack = fm_chfila.rulepack2easypack(this.rulepack);
                    } else if (mode == 'full') {
                        // switch to full mode
                        this.rulepack = fm_chfila.easypack2rulepack(this.easypack);
                    }
                    console.log('* switched mode to: ' + this.ui.mode);
                    this.$forceUpdate();
                },

                open_prdialog: function() {
                    fm_chfila.open_prdialog();
                },

                open_select_local_dialog: function() {
                    fm_chfila.open_select_local_dialog();
                },

                open_select_remote_dialog: function() {
                    fm_chfila.open_select_remote_dialog();
                },

                open_rulepack: function(rulepack_id) {
                    fm_chfila.open_rulepack(rulepack_id);
                },

                open_sample: function () {
                    fm_chfila.open_sample();
                },

                create_pack: function () {
                    if (this.rulepack_state != fm_chfila.rp.state.SAVED) {
                        var ret = window.confirm('Current rule pack is NOT saved. Are you sure to continue?');
                        if (ret) {
            
                        } else {
                            return;
                        }
                    }
                    fm_chfila.set_new_rulepack();
                },

                download_pack: function () {
                    if (this.ui.mode == 'easy') {
                        // which means we are using easy mode
                        // convert the easypack to rulepack
                        this.rulepack = fm_chfila.easypack2rulepack(this.easypack);
                    }
                    fm_chfila.download_pack();
                },

                download_mtrs: function () {
                    if (this.ui.mode == 'easy') {
                        // which means we are using easy mode
                        // convert the easypack to rulepack
                        this.rulepack = fm_chfila.easypack2rulepack(this.easypack);
                    }
                    fm_chfila.download_mtrs();
                },

                show_upload_and_test: function() {
                    Metro.infobox.open('#infobox-upload-and-test');
                },

                save_rulepack: function() {
                    fm_chfila.save_rulepack(
                        this.rulepack_id,
                        this.rulepack
                    );
                },

                savecopy_rulepack: function() {

                    this.rulepack_id = null;
                    this.rulepack.name = this.rulepack.name + ' - copy';

                    fm_chfila.savecopy_rulepack(this.rulepack);
                },

                ///////////////////////////////////////////////////////////////
                // Functions related to UI
                ///////////////////////////////////////////////////////////////

                del_rulepack: function(rulepack_id, rulepack_title) {
                    var ret = window.confirm('Are you sure to delete this rule package [' + rulepack_title + ']?');
                    if (ret) {
                        fm_chfila.del_rulepack(rulepack_id);
                    } else {

                    }
                },

                add_rule: function () {
                    this.rulepack.matchrules.push(fm_chfila.create_new_matchrule());
                },

                del_rule: function (rule_name) {
                    var ret = window.confirm('Are you sure?');
                    if (ret) {
                        fm_chfila.del_rule(rule_name);
                        console.log('* deleted match rule' + rule_name);
                    } else {
                    }
                },

                add_rsregexp: function () {
                    this.rulepack.rsregexps.push(fm_chfila.create_new_rsregexp());
                },

                del_rsregexp: function (name) {
                    var ret = window.confirm('Are you sure to delete this regexp?');
                    if (ret) {
                        fm_chfila.del_rsregexp(name);
                        console.log('* deleted rsregexp' + name);
                    } else {
                    }
                },

                add_context: function() {
                    this.rulepack.contexts.push(fm_chfila.create_new_context());
                },

                del_context: function(name) {
                    var ret = window.confirm('Are you sure to delete this context?');
                    if (ret) {
                        fm_chfila.del_context(name);
                        console.log('* deleted context' + name);
                    } else {
                    }
                },

                add_ergroup: function() {
                    this.easypack.ergroups.splice(0, 0, fm_chfila.create_new_ergroup());
                },

                del_ergroup: function(norm) {
                    var ret = window.confirm('Are you sure to delete this rule ['+norm+']?');
                    if (ret) {
                        fm_chfila.del_ergroup(norm);
                        console.log('* deleted ergroup ' + norm);
                    } else {
                    }
                },

                toggle_easy_context: function() {
                    this.ui.enable_context = !this.ui.enable_context;
                },

                toggle_easy_rule: function(ergroup) {
                    ergroup._is_shown = !ergroup._is_shown;
                },

                select_all_items: function() {
                    for (let i = 0; i < this.easypack.ergroups.length; i++) {
                        this.easypack.ergroups[i]._is_shown = true;
                    }
                },

                unselect_all_items: function() {
                    for (let i = 0; i < this.easypack.ergroups.length; i++) {
                        this.easypack.ergroups[i]._is_shown = false;
                    }
                },

                count_lines: function (text) {
                    return text.split('\n').length;
                },

                valid_pack_name: function (name) {
                    var re = /^[a-zA-z0-9_]+$/;
                    return re.test(name);
                },

                show_about: function() {
                    window.open('https://github.com/OHNLP/N3C-NLP-Documentation', '_blank');
                }
            },

            mounted: function () {
                Metro.init();
            },

            watch: {
                rulepack: {
                    handler(nval, oval) {
                        // rule pack is modified, update the state
                        // whatever changes, set to unsaved
                        this.rulepack_state = fm_chfila.rp.state.UNSAVED;
                    },
                    deep: true
                }
            }
        });

        // bind the event
        this.bind_fileinput_drag_drop();
        this.bind_fileinput_click();
    },

    _show_rulepack_list_in_prdialog: function(data) {
        this.vpp.rulepacks = data;
        jarvis.msg('Found [' + data.length + '] rule packages.');
    },

    download_pack: function () {
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.vpp.rulepack, null, 2));
        var dlAnchorElem = document.getElementById('downloadAnchorElem');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", this.vpp.rulepack.name + ".json");
        dlAnchorElem.click();
    },

    download_mtrs: function () {
        var zip = new JSZip();

        // create the file list of regexp
        var txt_fns = '';
        for (var i = 0; i < this.vpp.rulepack.rsregexps.length; i++) {
            var rsregexp = this.vpp.rulepack.rsregexps[i];
            var ffn = 'regexp/' + this.rp.prefix.rsregexp + rsregexp.name + '.txt';
            var txt = rsregexp.text;
            txt_fns += './' + ffn + '\n';
            // add to zip
            zip.file(ffn, txt);
            console.log('* add ' + ffn);
        }
        
        // create the context rules
        for (var i = 0; i < this.vpp.rulepack.contexts.length; i++) {
            var context = this.vpp.rulepack.contexts[i];
            var ffn = 'context/' + context.name + '.txt';
            var txt = context.text;
            txt_fns += './' + ffn + '\n';
            // add to zip
            zip.file(ffn, txt);
            console.log('* add ' + ffn);
        }

        // create the rule file
        var rules = '// ' + this.vpp.rulepack.name + '\n';
        for (let i = 0; i < this.vpp.rulepack.matchrules.length; i++) {
            const matchrule = this.vpp.rulepack.matchrules[i];
            rules += 'RULENAME="' + matchrule.rule_name + '",';
            rules += 'REGEXP="' + matchrule.regexp + '",';
            rules += 'LOCATION="' + matchrule.location + '",';
            rules += 'NORM="' + matchrule.norm + '"\n';
        }
        var rule_fn = 'rules/' + this.vpp.rulepack.fns.resources_rules_matchrules;
        txt_fns += './' + rule_fn + '\n';

        zip.file(rule_fn, rules);
        console.log('* add ' + rule_fn);

        // create the used_resources.txt
        txt_fns += './' + this.vpp.rulepack.fns.used_resources + '\n';
        zip.file(this.vpp.rulepack.fns.used_resources, txt_fns)

        // download this zip
        zip.generateAsync({ type: "blob" }).then(function (content) {
            saveAs(content, fm_chfila.vpp.rulepack.name + ".zip");
        });
    },

    /**************************************************************************
     * Easy Pack <-> Rule Pack Converter
     *************************************************************************/

    /**
     * Convert the norm to a valid regexp name
     * 
     * @param {string} norm 
     */
    norm2regexp_name: function(norm) {
        return norm.replace(/_/g, "");
    },

    regexp2regexp_name: function(regexp) {
        return regexp.match(/[A-Z0-9]+/gm)[0];
    },

    /**
     * Convert an Easy Pack to a Rule Pack
     * 
     * @param {object} easypack 
     */
    easypack2rulepack: function(easypack) {
        // create an empty rule pack for converting
        var rulepack = this.create_new_rulepack();

        // clear the default data
        rulepack.matchrules = [];
        rulepack.rsregexps = [];
        rulepack.contexts = [];
    
        // now update the simple parts according to the easypack
        rulepack.name = easypack.name;
        rulepack.contexts = easypack.contexts;

        // now update the complex parts according to the easypack
        for (let i = 0; i < easypack.ergroups.length; i++) {
            const ergroup = easypack.ergroups[i];
            var regexp_name = this.norm2regexp_name(ergroup.norm);
            var cm_name = regexp_name.toLowerCase();
            
            // create a matchrule
            var matchrule = this.create_new_matchrule();

            // update the matchrule
            // norm is just the norm
            matchrule.norm = ergroup.norm;
            // location is just the location
            matchrule.location = ergroup.location;
            // rule_name is the comb of rule_type and cm_name
            matchrule.rule_name = ergroup.rule_type + '_' + cm_name;
            // regexp is the comb of regexp_name according to the rule_type
            if (ergroup.rule_type == 'cm') {
                matchrule.regexp = '\\b(?i)(?:%re'+regexp_name+')\\b';

            } else if (ergroup.rule_type == 'rem') {
                matchrule.regexp = '\\b(?i)%re'+regexp_name+'\\b';

            } else {
                matchrule.regexp = '\\b(?i)(?:%re'+regexp_name+')\\b';
            }

            // create a rsregexp(?i)
            var rsregexp = this.create_new_rsregexp();

            // update the rsregexp
            rsregexp.name = regexp_name;
            rsregexp.text = ergroup.text;

            // save the new matchrule and rsregexp
            rulepack.matchrules.push(matchrule);
            rulepack.rsregexps.push(rsregexp);
        }

        return rulepack;
    },

    /**
     * Convert a Rule Pack to an Easy Pack
     * Attention! this converting may cause loss
     * 
     * @param {object} rulepack 
     */
    rulepack2easypack: function(rulepack) {
        // create an empty easy pack for converting
        var easypack = this.create_new_rulepack();

        // clear the content
        easypack.contexts = [];
        easypack.ergroups = [];
        
        // now update the easy part
        easypack.contexts = rulepack.contexts;

        // convert to ergroups
        // so, basically, the converting is from the matchrules to ergroup
        // but during the converting, need to check the content
        for (let i = 0; i < rulepack.matchrules.length; i++) {
            const matchrule = rulepack.matchrules[i];

            // get the rule_type: cm or rem
            var rule_type = matchrule.rule_name.split('_')[0];

            // get the rsregexp_name of this matchrule
            var rsregexp_name = null;
            try {
                rsregexp_name = this.regexp2regexp_name(matchrule.regexp);
            } catch(err) {
                console.log("* couldn't get rsregexp_name in " + matchrule.regexp);
            }
            
            // create an empty ergroup
            var ergroup = this.create_new_ergroup();

            // update the attributes
            ergroup.norm = matchrule.norm;
            ergroup.rule_type = rule_type;
            ergroup.location = matchrule.location;

            // now come to the complex part, need to link the regexp
            var text = '';
            for (let j = 0; j < rulepack.rsregexps.length; j++) {
                const rsregexp = rulepack.rsregexps[j];
                
                if (rsregexp.name == rsregexp_name) {
                    // found this regexp !
                    text = rsregexp.text;
                    break;
                }
            }
            // no matter what is found in the last, just use it
            ergroup.text = text;

            // add the the list
            easypack.ergroups.push(ergroup);
        }

        return easypack;
    },


    /**************************************************************************
     * Easy Pack Functions
     *************************************************************************/
    create_new_easypack: function() {
        return {
            name: 'rule_pack_name',
            contexts: [ this.create_new_context() ],
            ergroups: [ this.create_new_ergroup() ]
        }
    },

    create_new_ergroup: function() {
        var seq = 0;
        try {
            seq = this.vpp.$data.easypack.ergroups.length;
        } catch {
            seq = 0;
        }
        return {
            _is_shown: false,
            norm: 'NAME_'+seq,
            rule_type: 'cm',
            location: 'NA',
            text: 'fever\nfebris\nfebrile'
        };
    },

    del_ergroup: function(norm) {
        var new_ergroup = [];
        for (var i = 0; i < this.vpp.easypack.ergroups.length; i++) {
            var ergroup = this.vpp.easypack.ergroups[i];
            if (ergroup.norm == norm) {

            } else {
                new_ergroup.push(ergroup);
            }
        }
        this.vpp.easypack.ergroups = new_ergroup;
    },

    /**************************************************************************
     * Rule Pack Functions
     *************************************************************************/

    set_rulepack: function(id, state, rulepack) {
        fm_chfila.vpp.rulepack_id = id;
        fm_chfila.vpp.rulepack_state = state;
        fm_chfila.vpp.rulepack = rulepack;

        // then update the easy pack
        this.vpp.$data.easypack = fm_chfila.rulepack2easypack(rulepack);
    },

    set_new_rulepack: function() {
        this.set_rulepack(
            null, 
            this.rp.state.NEW, 
            this.create_new_rulepack()
        );
    },

    create_empty_rulepack: function () {
        return {
            name: '',
            matchrules: [ ],
            rsregexps: [ ],
            contexts: [ ],
            fns: {
                used_resources: 'used_resources.txt',
                resources_rules_matchrules: 'resources_rules_matchrules.txt'
            }
        };
    },

    create_new_rulepack: function () {
        return {
            name: 'rule_pack_name',
            matchrules: [ this.create_new_matchrule() ],
            rsregexps: [ this.create_new_rsregexp() ],
            contexts: [ this.create_new_context() ],
            fns: {
                used_resources: 'used_resources.txt',
                resources_rules_matchrules: 'resources_rules_matchrules.txt'
            }
        };
    },

    create_new_matchrule: function () {
        return {
            rule_name: 'cm_fever',
            regexp: '\\b(?i)(?:%reFEVER)\\b',
            location: 'NA',
            enabled: true,
            ignore_case: true,
            norm: 'FEVER'
        };
    },

    create_new_rsregexp: function () {
        return {
            name: 'FEVER',
            text: 'fever\nfebris\nfebrile'
        };
    },

    create_new_context: function() {
        var num = 0;
        if (this.vpp != null) {
            if (this.vpp.rulepack != null) {
                if (typeof(this.vpp.rulepack) != 'undefined') {
                    if (typeof(this.vpp.rulepack.contexts) != 'undefined') {
                        num = this.vpp.rulepack.contexts.length;
                    }
                }
            }
        }
        return {
            name: 'contextRule' + num,
            text: 'regex:(^|\s)\?(?=\s?\w+)~|~pre~|~poss~|~1\ndoes not demonstrate~|~pre~|~neg~|~1\ndid not demonstrate~|~pre~|~neg~|~1\ndo not demonstrate~|~pre~|~neg~|~1'
        };
    },

    del_rule: function (rule_name) {
        var new_matchrules = [];
        for (var i = 0; i < this.vpp.rulepack.matchrules.length; i++) {
            var matchrule = this.vpp.rulepack.matchrules[i];
            if (matchrule.rule_name == rule_name) {

            } else {
                new_matchrules.push(matchrule);
            }
        }
        this.vpp.rulepack.matchrules = new_matchrules;
    },

    del_rsregexp: function (name) {
        var new_rsregexps = [];
        for (var i = 0; i < this.vpp.rulepack.rsregexps.length; i++) {
            var rsregexp = this.vpp.rulepack.rsregexps[i];
            if (rsregexp.name == name) {

            } else {
                new_rsregexps.push(rsregexp);
            }
        }
        this.vpp.rulepack.rsregexps = new_rsregexps;
    },

    del_context: function(name) {
        var new_contexts = [];
        for (var i = 0; i < this.vpp.rulepack.contexts.length; i++) {
            var context = this.vpp.rulepack.contexts[i];
            if (context.name == name) {

            } else {
                new_contexts.push(context);
            }
        }
        this.vpp.rulepack.contexts = new_contexts;
    },


    /**************************************************************************
     * Rule Pack Server Functions
     *************************************************************************/

    open_sample: function () {
        $.get(
            fm_chfila.static_url.sample,
            { ver: Math.random() },
            function (data) {
                fm_chfila.set_rulepack(
                    null,
                    fm_chfila.rp.state.UNSAVED,
                    data
                );
            }, 'json'
        )
    },

    open_prdialog: function() {
        // first, show the panel with a loading animation
        Metro.infobox.open('#infobox-select-project-rulepack');

        // second, load latest data
        $.get(
            '/get_rulepack_list',
            { ver: Math.random(), project_id: '_default' },
            function(data) {
                // show the rulepack list
                fm_chfila._show_rulepack_list_in_prdialog(data.data);
            }
        );
    },

    open_select_local_dialog: function() {
        // show the panel of local folder / zip
        $('#boxtitle').text($('#boxtitle').attr('txt'));
        Metro.infobox.open('#infobox-select-local-rulepack');
    },

    open_select_remote_dialog: function() {
        Metro.infobox.open('#infobox-select-remote-rulepack');
    },

    open_rulepack: function(rulepack_id) {
        // load data from server
        $.get(
            '/get_rulepack',
            { ver: Math.random(), rulepack_id: rulepack_id },
            function(data) {
                fm_chfila.set_rulepack(
                    data.r.id,
                    fm_chfila.rp.state.NEW,
                    data.r.dat
                );
                
                jarvis.msg('Loaded rule package [' + data.r.data.name + '].');
                // close the modal
                Metro.infobox.close('#infobox-select-project-rulepack');

            }, 'json'
        );
    },

    del_rulepack: function(rulepack_id) {
        $.post(
            '/del_rulepack',
            { rulepack_id: rulepack_id },
            function(data) {
                jarvis.msg('Deleted rule package.');

                // reload the list
                fm_chfila.open_prdialog();
            }, 'json'
        );
    },

    save_rulepack: function (rulepack_id, rulepack) {
        if (rulepack_id == null) {
            rulepack_id = -1;
        }
        var project_id = 0;
        $.post(
            './save_rulepack',
            { 
                rulepack_id: rulepack_id,
                project_id: project_id,
                title: rulepack.name,
                data: JSON.stringify(rulepack)
            },
            function (data) {
                console.log('* save rulepack: ', data.r);
                // update state
                fm_chfila.vpp.rulepack_state = fm_chfila.rp.state.SAVED;
                // update the id
                fm_chfila.vpp.rulepack_id = data.r.id;
                // show message
                jarvis.msg('Rule Package is saved.');
            }, 'json'
        );
    },

    savecopy_rulepack: function (rulepack) {
        var rulepack_id = -1;
        var project_id = 0;
        $.post(
            './save_rulepack',
            { 
                rulepack_id: rulepack_id,
                project_id: project_id,
                title: rulepack.name,
                data: JSON.stringify(rulepack)
            },
            function (data) {
                console.log('* save rulepack: ', data.r);
                // update id
                fm_chfila.vpp.rulepack_id = data.r.id;
                // update state
                fm_chfila.vpp.rulepack_state = fm_chfila.rp.state.SAVED;
                // show message
                jarvis.msg('Rule Package is copied and saved.');
            }, 'json'
        );
    },

    upload_and_test: function() {
        // show animation
        $('#btn-upload-and-test').attr('disabled', 'disabled');
        $('#btn-upload-and-test').html('<i class="fas fa-spinner fa-pulse"></i> Parsing ...');

        // var doc_text = window.prompt('doc_text:', 'I have a dry cough and fever. No sore throat');
        var doc_text = $('#text-for-test').val();
        var doc_date = $('#datepicker').val().trim();
        var rulepack = JSON.stringify(this.get_current_rulepack());

        // console.log(rulepack);
        var url = this.get_url(this.url.ie_editor_test, 'ohnlp4covid_dev');
        console.log('* send request to ' + url);

        $.ajax({
            url: url,
            type: 'post',
            dataType: 'json',
            data: {
                rulepack: rulepack, 
                doc_text: doc_text,
                doc_date: doc_date
            },
            success: function(data) {
                $('#btn-upload-and-test').attr('disabled', null).html('Test');
                console.log(data);
                if (data.success) {
                    fig_bratvis.draw(data.data);
                } else {
                    $('#fig_bratvis').html('<p>' + data.msg + '<p>');
                }
            },
            error: function(data, textStatus, errorThrown) {
                $('#btn-upload-and-test').attr('disabled', null).html('Test');
            }
        });
    },


    /**************************************************************************
     * Local folder / zip parsing functions
     *************************************************************************/

    // for temp upload files
    upload_type: null,
    upload_files: null,
    upload_files_finished: null,
    upload_folder_name: null,

    bind_fileinput_drag_drop: function() {
        // init the upload box
        let dropzone = document.getElementById("dropzone");

        dropzone.addEventListener("dragover", function(event) {
            event.preventDefault();
        }, false);

        dropzone.addEventListener("drop", function(event) {
            let items = event.dataTransfer.items;
        
            event.preventDefault();
        
            // clear the old files
            fm_chfila.upload_files = [];

            // clear the old folder name
            fm_chfila.upload_folder_name = '';

            // user should only upload one folder or a file

            if (items.length>1) {
                console.log('* selected more than 1 item!');
                return;
            }

            for (let i=0; i<items.length; i++) {
                let item = items[i].webkitGetAsEntry();
        
                if (item) {
                    // ok, user select a folder
                    if (item.isDirectory) {
                        fm_chfila.upload_folder_name = item.name;
                        fm_chfila.parse_drop_dir(item);
                        fm_chfila.upload_type = 'dir';

                    } else {
                        // should be a zip file
                        fm_chfila.parse_drop_zip(item);
                        fm_chfila.upload_type = 'zip';
                    }
                }

                // just detect one item, folder or zip
                break;
            }

        }, false);
    },

    bind_fileinput_click: function() {
        // let dropzone = document.getElementById("dropzone");
        // dropzone.addEventListener("click", function(event) {
        //     var input_elem = document.getElementById('local_ruleset_folder');
            
        //     // trigger the event
        //     input_elem.click();

        // });

        // let input_elem = document.getElementById('local_ruleset_folder');

        // input_elem.addEventListener('change', function(event) {
        //     let input_elem = document.getElementById('local_ruleset_folder');
        //     var files = input_elem.files;
        //     fm_chfila.upload_files = [];
        //     fm_chfila.scan_files(files);
        // })
        
        let input_local_ruleset_zip = $("#local_ruleset_zip");
        input_local_ruleset_zip.on("change", function(event) {
            var files = event.target.files;

            fm_chfila.read_local_zip(files[0]);
        });

    },

    parse_drop_zip: function(item) {
        // the item is just a FileEntry, convert it to File Object
        item.file(function(file) {
            fm_chfila.read_local_zip(file);
        });
    },

    parse_drop_dir: function(item) {
        fm_chfila.scan_item(item);
        fm_chfila.read_scan_files();
    },

    parse_input_files: function(files) {
        fm_chfila.scan_files(files);
        fm_chfila.read_scan_files();
    },

    scan_item: function (item) {
        // console.log('* found item ', item);
      
        if (item.isDirectory) {
            let directoryReader = item.createReader();
            
            directoryReader.readEntries(function(entries) {
                entries.forEach(function(entry) {
                    fm_chfila.scan_item(entry);
                });
            });

            return
        }

        // ok, it's a file
        if (fm_chfila.upload_files == null) {
            fm_chfila.upload_files = [];
        }
        
        fm_chfila.upload_files.push(item);

        // show how many files
        $('#boxtitle').html(
            'Found <b>' + fm_chfila.upload_files.length + '</b> files'
        );
    },

    scan_files: function(files) {
        // ok, it's a file
        if (fm_chfila.upload_files == null) {
            fm_chfila.upload_files = [];
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log('* found file ' + file.webkitRelativePath);
            fm_chfila.upload_files.push(file);
        }

        // show how many files
        $('#boxtitle').html(
            'Found <b>' + fm_chfila.upload_files.length + '</b> files'
        );
    },

    extract_rsregexp_name: function(text) {
        var rx = /resources_regexp_re(\S+).txt/gm;
        return this._regexp(rx, text);
    },

    extract_matchrule_rule_name: function(text) {
        var rx = /RULENAME\=\"([a-zA-Z_0-9]+)\"/gm;
        return this._regexp(rx, text);
    },

    extract_matchrule_location: function(text) {
        var rx = /LOCATION\=\"([a-zA-Z_0-9]+)\"/gm;
        return this._regexp(rx, text);
    },

    extract_matchrule_norm: function(text) {
        var rx = /NORM\=\"([a-zA-Z_0-9]+)\"/gm;
        return this._regexp(rx, text);
    },

    extract_matchrule_regexp: function(text) {
        var ps = text.split(',');
        for (let i = 0; i < ps.length; i++) {
            const p = ps[i];
            if (p.startsWith('REGEXP')) {
                return p.substring(8, p.length-1);
            }
        }
        return null;
    },

    _regexp: function(rx, text) {
        var arr = rx.exec(text);
        if (arr.length>1) {
            return arr[1];
        } else {
            return null;
        }
    },

    read_file_async: function(fileEntry, callback) {
        fileEntry.file(function(file) {
            let reader = new FileReader();
            reader.onload = callback;
            reader.readAsText(file)
        });
    },


    read_local_zip: function(file) {
        console.log(file)
        var rulepack = this.create_empty_rulepack();
        fm_chfila.rulepack = rulepack;

        // set the rulepack name as the upload folder / zip name
        fm_chfila.rulepack.name = file.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        JSZip.loadAsync(file).then(function(zip) {
            zip.forEach(
                function(relativePath, zipEntry) {
                    // console.log(zipEntry);

                    if (zipEntry.dir) {
                        return;
                    }

                    fm_chfila.upload_files.push(zipEntry);
                    $('#boxtitle').html(
                        'Found <b>' + fm_chfila.upload_files.length + '</b> files in zip'
                    );

                    var callback = function(zipobj) {
                        return function(text) {
                            let path = zipobj.name.split('/')
                            let fn = path[path.length - 1];
                            console.log(fn);
                            // console.log(text)

                            if (fn.startsWith('used_resources')) {

                            } else if (fn.startsWith('contextRule')) {
                                fm_chfila.__add_context_rule(text);

                            } else if (fn.startsWith('resources_rules_matchrules')) {
                                fm_chfila.__add_matchrules(text);

                            } else if (fn.startsWith('resources_regexp_re')) {
                                var norm = fm_chfila.extract_rsregexp_name(fn);
                                fm_chfila.__add_regexp(norm, text);

                            } else {
                                console.log('* unknown file', fn);
                            }
                        }
                    }(zipEntry);

                    zipEntry.async("text").then(callback);
                }
            );

        }, function(e) {
            console.log('* something wrong when unzipping')
            console.log(e);
        });

        
    },

    __add_context_rule: function(text) {
        // create a new context rule obj
        var context = fm_chfila.create_new_context();
        context.text = text;

        // add to rulepack
        fm_chfila.rulepack.contexts.push(context);
    },

    __add_matchrules: function(text) {
        // split the text into lines
        var lines = text.split('\n');

        // loop on line
        for (let i = 0; i < lines.length; i++) {
            var line = lines[i];
            console.log(line);

            line = line.trim();

            if (line == '') { continue }

            var enabled = true;
            if (line.startsWith('//')) {
                // comment?
                enabled = false;
                continue;
            }

            // now try to extract the content
            var rule_name = fm_chfila.extract_matchrule_rule_name(line);
            var regexp = fm_chfila.extract_matchrule_regexp(line);
            var location = fm_chfila.extract_matchrule_location(line);
            var norm = fm_chfila.extract_matchrule_norm(line);

            var matchrule = fm_chfila.create_new_matchrule();
            matchrule.rule_name = rule_name;
            matchrule.regexp = regexp;
            matchrule.location = location;
            matchrule.norm = norm;
            matchrule.enabled = enabled;

            // add to rulepack
            fm_chfila.rulepack.matchrules.push(matchrule);
        }
    },

    __add_regexp: function(norm, text) {
        console.log('* regexp norm', norm)

        // create a new rsregexps
        var rsregexp = fm_chfila.create_new_rsregexp();
        rsregexp.name = norm;
        rsregexp.text = text;

        // add to current
        fm_chfila.rulepack.rsregexps.push(rsregexp);
    },

    read_scan_files: function() {
        console.log('* start reading scanned files ' + fm_chfila.upload_files.length);
        // folder check first, if something wrong, skip

        // then create an empty rulepack
        var rulepack = this.create_empty_rulepack();
        fm_chfila.rulepack = rulepack;

        // set the rulepack name as the upload folder / zip name
        fm_chfila.rulepack.name = fm_chfila.upload_folder_name;

        // init the finished files
        fm_chfila.upload_files_finished = [];

        // check every file items
        for (let i = 0; i < fm_chfila.upload_files.length; i++) {
            const file = fm_chfila.upload_files[i];
            
            var fn = file.name;
            console.log('* reading ' + fn);

            if (fn.startsWith('used_resources')) {
                // this is the all file list
                fm_chfila.upload_files_finished.push(fn);
                fm_chfila.__check_is_read_all_files();

            } else if (fn.startsWith('contextRule')) {
                var callback = function(ctx) {
                    return function(event) {
                        var text = event.target.result;
                        fm_chfila.__add_context_rule(text);
                        fm_chfila.upload_files_finished.push(text);
                        fm_chfila.__check_is_read_all_files();
                    }
                }('ctx');

                fm_chfila.read_file_async(file, callback);

            } else if (fn.startsWith('resources_rules_matchrules')) {
                // the match rule file
                var callback = function(event) {
                    var text = event.target.result;
                    fm_chfila.__add_matchrules(text);
                    fm_chfila.upload_files_finished.push(text);
                    fm_chfila.__check_is_read_all_files();
                };

                fm_chfila.read_file_async(file, callback);

            } else if (fn.startsWith('resources_regexp_re')) {
                // the rules file

                // get the norm name
                var name = fm_chfila.extract_rsregexp_name(fn);
                var callback = function(norm) {
                    return function(event) {
                        var text = event.target.result;
                        fm_chfila.__add_regexp(norm, text);
                        fm_chfila.upload_files_finished.push(text);
                        fm_chfila.__check_is_read_all_files();
                    }
                }(name);
                fm_chfila.read_file_async(file, callback);

            } else {
                fm_chfila.upload_files_finished.push(fn);
                fm_chfila.__check_is_read_all_files();
            }
        }
  
    },

    __check_is_read_all_files: function() {
        if (fm_chfila.upload_files_finished.length == 
            fm_chfila.upload_files.length) {
            // dispatch an event
            document.dispatchEvent(new Event('read_all_files'));
        } else {
            console.log('* read ' + fm_chfila.upload_files_finished.length + 
                ' / ' + fm_chfila.upload_files.length);
        }
    },

    __on_read_all_files: function() {
        // make a copy and put in the vpp
        fm_chfila.set_rulepack(
            null,
            fm_chfila.rp.state.NEW,
            JSON.parse(JSON.stringify(fm_chfila.rulepack))
        )

        // clear the current upload environment
        fm_chfila.rulepack = null;
        fm_chfila.upload_files = null;

        // finally, close the infobox
        Metro.infobox.close('#infobox-select-local-rulepack');
    },

    /**
     * Import the fm_chfila.rulepack to vpp
     * 
     */
    import_ruleset_from_local: function() {
        if (fm_chfila.upload_type == 'dir') {
            // then we need to read all files from fileentry
            document.addEventListener('read_all_files', function(event) {
                fm_chfila.__on_read_all_files();
            }, false);

            fm_chfila.read_scan_files();
        } else {
            // then just done reading,
            fm_chfila.__on_read_all_files();
        }
        
    }
};
