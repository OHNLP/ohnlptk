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
                matchrule.regexp = '\\b(?:%re'+regexp_name+')\\b';

            } else if (ergroup.rule_type == 'rem') {
                matchrule.regexp = '\\b%re'+regexp_name+'\\b';

            } else {
                matchrule.regexp = '\\b(?:%re'+regexp_name+')\\b';
            }

            // create a rsregexp
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
            var rsregexp_name = this.regexp2regexp_name(matchrule.regexp);
            
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
            regexp: '\\b(?:%reFEVER)\\b',
            location: 'NA',
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
            if (typeof(this.vpp.rulepack) != 'undefined') {
                if (typeof(this.vpp.rulepack.contexts) != 'undefined') {
                    num = this.vpp.rulepack.contexts.length;
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
    }
};
