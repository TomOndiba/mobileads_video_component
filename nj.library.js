(function() {
    
    var macro_data = {
        'nexage' : {
            'macro_adsub4' : '_ADSUB4_',
            'macro_adadid' : '_ADADID_',
            'macro_adbnid' : '_ADBNID_',
            'macro_adsub2' : '_ADSUB2_'
        },
        'inneractive' : {
            'macro_transaction_id' : '{transaction_id}',
            'macro_affiliate_id' : '{affiliate_id}'
        },
        'appier' : {
            'macro_did' : '${did}',
            'macro_didmd5' : '${didmd5}',
            'macro_didsha1' : '${didsha1}',
            'macro_androidid' : '${androidid}',
            'macro_mac' : '${mac}',
            'macro_macmd5' : '${macmd5}',
            'macro_macsha1' : '${macsha1}',
            'macro_odin' : '${odin}',
            'macro_bidobjid' : '${bidobjid}',
            'macro_partner_id' : '${partner_id}',
            'macro_channel_id' : '${channel_id}',
            'macro_cid' : '${cid}',
            'macro_adid' : '${adid}',
            'macro_crid' : '${crid}',
            'macro_ho_sub1' : '${ho_sub1}',
            'macro_idfa' : '${idfa}',
            'macro_uu' : '${uu}'
        },
        'pocketmath' : {
            'macro_imp_id' : '${imp_id}',
            'macro_gaid' : '${gaid}',
            'macro_ifa' : '${ifa}'
        },
        'i-mobile' : {
            'macro_android_id_md5' : '%ANDROID_ID_MD5%',
            'macro_google_aid' : '%GOOGLE_AID%',
            'macro_idfa' : '%IDFA%',
            'macro_rid' : 'rid',
            'macro_sid' : 'sid'
        },
        'sitescout' : {
            'macro_dpId' : '{dpId}',
            'macro_postbackId' : '{postbackId}',
            'macro_networkId' : '{networkId}',
            'macro_siteId' : '{siteId}',
            'macro_campaignId' : '{campaignId}',
            'macro_adId' : '{adId}'
        },
        'meliba' : {
            'macro_adcloud_conversioninfo' : '${ADCLOUD_CONVERSIONINFO}'
        },
        'bidstalk' : {
            'macro_conversion_id' : '{CONVERSION_ID}',
            'macro_campaign_id' : '{CAMPAIGN_ID}'
        },
        'twitter' : {
            'macro_eaid' : '%eaid!',
            'macro_ecid' : '%ecid!',
            'macro_eudid' : '%eudid!',
            'macro_keywords' : '%%KEYWORDS%%'
        },
        'rubicon' : {
            'macro_campaign_id' : '{CAMPAIGN_ID}',
            'macro_account_id' : '{ACCOUNT_ID}',
            'macro_ad_id' : '{AD_ID}',
            'macro_bid_id' : '{BID_ID}',
            'macro_custom_id' : '{CUSTOM_ID}',
            'macro_price' : '{PRICE}'
        }
    }
      
    var proto_methods = {
        loaded: function () {
            var node = this.node;
            
            if (typeof node == 'undefined') { return; }
            
            /* Set Loaded Flag */
            node.setAttribute('frame_loaded',true);
        },
        call: function (options) {
            var node = this.node;

            if (typeof options.window != 'undefined' && options.window) {
                /* post message to iframe */
                window.postMessage({'auth' : options.auth, 'data' : options.data},'*');
            }

            if (typeof node == 'undefined' || node == null) { return; }

            var post = function () {
                /* post message to iframe */
                if (typeof node.contentWindow != 'undefined') {
                    node.contentWindow.postMessage({'auth' : options.auth, 'data' : options.data},'*');
                }
            };

            var loaded = node.getAttribute('frame_loaded');

            if (loaded == 'true') {
                post();
            } else {
                node.addEventListener('load', function () {
                    post();
                    node.setAttribute('frame_loaded',true);

                    /* @NOTE set iframe node to google for visibility - NJ */
                    if (typeof google != 'undefined' && typeof google.setTarget != 'undefined') {
                        google.setTarget(node);
                    }
                });
            }
        },
        listen: function (options) {

            var receiveMessage = function (event) {
                options.callback(event.data);
            }
            window.addEventListener("message", receiveMessage, false);
            
        },
        macro: function (options) {
                                   
            if (typeof options.url == 'undefined') {
                return;
            }
                                   
            var dsp = options.dsp;
            var macro = options.macro;

            for (var key in macro) {
                options.url = options.url.replace(macro_data[dsp][key], macro[key]);
            }
            
            return options.url;
        }
    }, nj, _nj;
    
    

    _nj = function(selector) { this.node = typeof selector == 'object' ? selector: document.querySelector(selector); };
    _nj.prototype = proto_methods;

    this.nj = function(selector) { return new _nj(selector); };
    
    this.nj.fn = proto_methods;
    
}());