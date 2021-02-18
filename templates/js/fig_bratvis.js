var collData = {
    entity_types: [{
        type: 'Regex',
        labels: ['Regex'],
        bgColor: '#7fa2ff',
        borderColor: 'darken'
    }, {
        type: "Dict",
        labels: ['Dict'],
        bgColor: '#5ea015',
        borderColor: 'darken'
    }, {
        type: "Timex3",
        labels: ['Timex3'],
        bgColor: '#8f84ec',
        borderColor: 'darken'
    }],
    entity_attribute_types: [
        {
            'type': 'norm',
            /* brat supports multi-valued attributes, but in our case we will only
                use a single value and add a glyph to the visualisation to indicate
                that the entity carries that attribute */
            'values': {
            }
        },
        {
            "type": "val",
            "name": "TimexVal",
            "values": {
            }
        },
        {
            "type": "TimexType",
            "name": "TimexType",
            "values": {
                "DATE": {
                    "glyph": "[DATE]",
                },
                "TIME": {
                    "glyph": "[TIME]",
                },
                "DATETIME": {
                    "glyph": "[DATETIME]",
                },
                "DURATION": {
                    "glyph": "[DURATION]",
                }
            }
        },
        {
            "values": {
                "Positive": {
                    // "box": "none",
                    "glyph": "[Positive]",
                    // "dashArray": "1,2" //Incertitude
                },
                "Negated": {
                    // "box": "crossed",
                    "glyph": "[Negated]",
                    // "dashArray": "3,4" //Incertitude
                }
            },
            "type": "certainty",
            "name": "certainty"
        },
        {
            "values": {
                "Present": {
                    "glyph": "[Present]",
                },
                "HistoryOf": {
                    "glyph": "[HistoryOf]",
                }
            },
            "type": "status",
            "name": "status"
        },
        {
            "values": {
                "Patient": {
                    "glyph": "[Patient]",
                },
                "Others": {
                    "glyph": "[Others]",
                }
            },
            "type": "experiencer",
            "name": "experiencer"
        }
    ]
};

var fig_bratvis = {
    plot_id: 'fig_bratvis',
    bratLocation: '/static/lib/brat',

    timex2date: function(v, d) {
        // v is the TPZ#YYYY-MM-DD format date string from result
        // d is the YYYY-MM-DD format date string of baseline date
        var date = d;
        if (v.substring(0, 3) == 'TPZ') {
            var sign = v.substring(3, 4);
            var dnum = v.substring(4, 14).split('-');

            var d_year = parseInt(dnum[0]);
            var d_month = parseInt(dnum[1]);
            var d_day = parseInt(dnum[2]);

            date = dayjs(d);
            if (sign == '-') {
                date = date.subtract(d_day, 'day');
                date = date.subtract(d_month, 'month');
                date = date.subtract(d_year, 'year');
            } else {
                date = date.add(d_day, 'day');
                date = date.add(d_month, 'month');
                date = date.add(d_year, 'year');
            }
        } else {
            date = dayjs(v);
        }
        console.log('* date: ', date);
        return date;
    },

    init: function () {

        head.js(
            // External libraries
            this.bratLocation + '/lib/jquery.min.js',
            this.bratLocation + '/lib/jquery.svg.min.js',
            this.bratLocation + '/lib/jquery.svgdom.min.js',

            // brat helper modules
            this.bratLocation + '/src/configuration.js',
            this.bratLocation + '/src/util.js',
            this.bratLocation + '/src/annotation_log.js',
            this.bratLocation + '/lib/webfont.js',

            // brat modules
            this.bratLocation + '/src/dispatcher.js',
            this.bratLocation + '/src/url_monitor.js',
            this.bratLocation + '/src/visualizer.js'
        );

        head.ready(function () {
            // bind to local variable
            fig_bratvis.Util = Util;
        });
    },

    draw: function (data, doc_date) {
        // update data
        this.data = data;
        this.doc_data = doc_date;

        // $('#' + this.plot_id).html('');
        // create a new div
        var new_div_id = this.plot_id + '_' + (Math.random() * 100000).toFixed(0);

        $('#' + this.plot_id).html(`
        <div id="${new_div_id}" class="brat-vis" style="width:100%;">
        </div>
        `);

        // update the collData according to data
        for (var i = 0; i < data.attributes.length; i++) {
            var attr = data.attributes[i];
            var t = attr[1]; // attr type
            var v = attr[3];
            if (t == 'norm') {
                if (collData.entity_attribute_types[0].values.hasOwnProperty(v)) {
                    
                } else {
                    collData.entity_attribute_types[0].values[v] = {
                        glyph: "[" + v + "]"
                    };
                }
            } else if (t == 'val') {
                var dt = this.timex2date(v, doc_date);
                var dt_str = dt.format('YYYY-MM-DD');
                if (collData.entity_attribute_types[1].values.hasOwnProperty(dt_str)) {
                    
                } else {
                    collData.entity_attribute_types[1].values[v] = {
                        glyph: "[" + dt_str + "]"
                    };
                }
            }
        }

        this.Util.embed(
            new_div_id,
            $.extend({}, collData),
            $.extend({}, data),
            webFontURLs
        )
    }
};

var webFontURLs = [
    fig_bratvis.bratLocation + '/css/fonts/Astloch-Bold.ttf',
    fig_bratvis.bratLocation + '/css/fonts/PT_Sans-Caption-Web-Regular.ttf',
    fig_bratvis.bratLocation + '/css/fonts/Liberation_Sans-Regular.ttf'
];