Vue.component('iaa-tag-info', {
    data: function () {
        return {
            update: 0,
        }
    },
    methods: {
        /**
         * Create a context HTML for showing the tag information
         * @param {Object} tag the annotated tag
         * @param {Object} ann the ann object
         */
         get_iaa_context_html: function(tag, ann) {
            // first, convert the tag spans for locating
            var loc = iaa_calculator.spans2loc(tag.spans);
            var spans_text = tag.text;

            // get the context start
            var c_start = loc[0] - 200;
            if (c_start < 0) { c_start = 0; }

            // get the context end
            var c_end = loc[1] + 200;
            if (c_end > ann.text.length) { c_end = ann.text.length; }

            // now create a text
            var html = [
                // the context before tag spans
                ann.text.substring(c_start, loc[0]),

                // the tag itself
                '<span class="mark-tag mark-tag-' + tag.tag + '">',
                spans_text,
                '</span>',

                // the context after tag spans
                ann.text.substring(loc[1], c_end)
            ];

            return html.join('');
        },
    },

    computed: {
        
    },

    props: [
        'tag',
        'ann',
        'dtd',
        'force_module_update',
    ],

    template: `
<div class="iaa-tag-detail-info w-100 d-flex flex-column" 
    :force_module_update="force_module_update">
    <div class="d-flex flex-row flex-wrap flex-align-end">
        <div class="mr-2">
            <span class="mr-1"
                v-bind:class="'mark-tag-' + tag.tag">
                {{ tag.id }}
            </span>
            <span>
                {{ tag.spans }}: 
                <b>
                    {{ tag.text }}
                </b>
            </span>
        </div>
        
        <div v-for="(attlist, attlist_idx) in dtd.tag_dict[tag.tag].attlists"
            v-if="!['id','spans','text','tag'].contains(attlist.name)"
            class="iaa-tag-attlist mr-1 ml-1 d-flex flex-column">

            <div class="iaa-tag-attlist-name">
                &nbsp;{{ attlist.name }}:
            </div> 
            
            <div>
                &nbsp;{{ tag[attlist.name] }}
            </div>
            
        </div>
    </div>

    <div v-html="get_iaa_context_html(tag, ann)"
        class="iaa-tag-context mt-1">
    </div>  
</div>   
`
});