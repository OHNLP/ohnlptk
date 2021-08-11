Vue.component('iaa-tag-info-gs', {
    data: function () {
        return {
            update: 0,
        }
    },
    methods: {

        delete_tag: function() {

        },

        upper: function(v) {
            return v.toLocaleUpperCase();
        }
    },

    computed: {
        
    },

    props: [
        'cm',
        'from',
        'tag_obj',
        'tag_idx',
        'ann',
        'dtd',
        'force_module_update',
    ],

    template: `
<div v-if="tag_obj != null"
    class="iaa-tag-detail-info w-100 d-flex flex-column" 
    v-bind:class="'iaa-tag-detail-info-' + cm"
    :force_module_update="force_module_update">
    <div class="d-flex flex-row flex-wrap flex-align-end">
    
        <div class="iaa-tag-detail-oper">
            <button class="btn btn-xs"
                :title="'Delete this [' + tag_obj.tag.text + '] from goldstandard'">
                Delete
            </button>
        </div>

        <div class="iaa-tag-detail-info-text-gs mr-2">
            <span class="mr-1">
                <i class="fa fa-user"></i>
                <b>
                {{ upper(tag_obj.from) }}
                </b>
            </span>
            <span>
                {{ tag_obj.tag.spans }}: 
                <b>
                    {{ tag_obj.tag.text }}
                </b>
            </span>
        </div>
        
    </div>
</div>
<div v-else
    class="iaa-tag-detail-info w-100 d-flex flex-column">

    Not decided
</div>
`
});