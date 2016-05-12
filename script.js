/*
* Description
* so the whole idea behind the structure, is with minimal changes neded to use it in both templated ad and freeflow ad 
* make sure that there's NO changes needed in the prototype render and events, when using in both ad
* the only minimal changes is only allowed in the constructor 
*
* the params pass in vary for different type, but will have those which is necessary, please refer to the commments below
* 
* use only javascript in the whole component if possible
* prototye EVENTS support only NATIVE Javascript, NO jquery allowed, because freeflow ad serving doesn't import jquery
* constructor and render can use jquery, but not recommeneded 
*/
var component = function (options) {
    /* currently the content is pass in as jquery object, and need to change to javascript object */
    this.content = document.querySelector(options.content.selector);
    this.data = options.data;
    this.id = options.id;
    
    /* variable which need to be manipulated for freeflow */
    this.videoContainer;
    this.video;
    this.coverImage;
    this.endingImage;
    
    this.render();
    this.events();
}

component.prototype = {
    initialize : function () {},
    render : function () {
        
        /* video container */
        this.videoContainer = document.createElement('div');
        this.videoContainer.id = 'video-container-' + this.id;
        this.videoContainer.className = 'video-container';
        
        /* render video */
        this.video = document.createElement('video')
        this.video.id = 'video';
        this.video.controller = true;
        this.video.innerHTML = 
            '<source src="' + this.data.video.src.mp4 + '" type="video/mp4" />\
            <source src="' + this.data.video.src.webm + '" type="video/webm"/>\
            <source src="' + this.data.video.src.ogg + '" type="video/ogg" />';

        this.videoContainer.appendChild(this.video);
        
        /* cover image */
        this.renderCoverImage();
        /* ending image */
        this.renderEndingImage();
        
        this.content.appendChild(this.videoContainer);
    },
    renderCoverImage : function () {
        if (this.data.video.coverImage.src != '') {
            this.coverImage = document.createElement('img');
            this.coverImage.width = '300';
            this.coverImage.height = '250';
            this.coverImage.id = 'cover-image-' + this.id;
            this.coverImage.className = 'cover-image';
            this.coverImage.src = this.data.video.coverImage.src;
        
            this.videoContainer.appendChild(this.coverImage);
        }
    },
    renderEndingImage : function () {
        if (this.data.video.endingImage.src != '') {
            this.endingImage = document.createElement('img');
            this.endingImage.width = '300';
            this.endingImage.height = '250';
            this.endingImage.id = 'ending-image-' + this.id;
            this.endingImage.className = 'ending-image';
            /* Hide by default */
            this.endingImage.style.display = 'none';
            this.endingImage.src = this.data.video.endingImage.src;
        
            this.videoContainer.appendChild(this.endingImage);
        }
    },
    
    
    
    
    events : function () {
        
        var _this = this;
        
        /* cover image */
        this.eventsCoverImage();
        
        this.video.addEventListener('ended', function () {
            _this.eventsEndingImage();
        })
        
    },
    eventsCoverImage : function () {
        var _this = this;
        
        if (this.coverImage != '') {
            var fn = [];
            /* play video */
            fn[0] = function (e) {
                _this.video.play();
                e.target.style.display = 'none';
            }
            /* open landing page */
            fn[1] = function () {
                console.log(_this.data.video.coverImage.lpUrl);
                
                e.target.style.display = 'none';
            }
            /* click event for cover image */
            this.coverImage.addEventListener('click', fn[this.data.video.coverImage.action])
        }
    },
    eventsEndingImage : function () {
        if (this.endingImage != '') {
            this.endingImage.style.display = 'block';
        }
    }
}

/* Initializing */
new component ({
    container : $('#test'), //optional (freeflow ad creation)
    id : 1,
    content : $('#test'), // needed for rendering only
    controller : null, //optional (freeflow creation)
    sdk : null, //optional (freeflow)
    tab : 'tab1',
    layer : 'layer1', //optional (freeflow)
    data : {
        video : {
            src : {
                mp4 : 'http://www.w3schools.com/html/mov_bbb.mp4',
                webm : '',
                ogg : 'http://www.w3schools.com/html/mov_bbb.ogg'
            },
            coverImage : {
                src : 'http://www.imagine-publishing.co.uk/adresources/images/300x250.jpg',
                action : 0,
                lpUrl : ''
            },
            endingImage : {
                src : 'http://www.imagine-publishing.co.uk/adresources/images/300x250.jpg',
                action : 0,
                lpUrl : ''
            },
            controller : 0,
            autoplay : 0,
            clickthrough : {
                txt : '', 
                lpUrl : ''
            },
            extTrackers : {
                type : 0,
                video_play : '',
                video_play_25 : '',
                video_play_50 : '',
                video_play_75 : '',
                video_play_100 : ''
            }
        }
        
    } // needed for rendering only
})