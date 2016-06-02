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
    this.videoState = 0; //0 - unplayed, 1 - playing, 2 - pause. 3 - ended
    this.coverImage = '';
    this.endingImage = '';
    this.autoplay = this.data.video.autoplay; // 0 - none, 1 - autoplay, 2 - inview
    this.clickthrough = '';
    this.replayBtn = '';
    this.specialControl = '';
    this.playTimeTracking = function () {};
    this.control = {};
    
    /* templated ad & flexi ad creator */
    this.render();
    
    /* html5 */
    if (this.data.video.mobile) {
        this.mobile();
        var desktopVideo = this.videoContainer.querySelector('video');
        desktopVideo.parentNode.replaceChild(this.video, desktopVideo);
    }
    this.events();
}

component.prototype = {
    initialize : function () {},
    render : function () {
        
        /* video container */
        this.videoContainer = document.createElement('div');
        this.videoContainer.id = 'video-container-' + this.id;
        this.videoContainer.className = 'video-container';
        
        /* to be used by templated adserving only */
        /*
        if (this.data.video.mobile) {
            this.mobile();    
        } else {
            this.renderVideo();
        }
        */
        /* to be used by both ad creator */
        this.renderVideo();
        
        /* control */
        if (this.data.video.control == 1) {
            //this.video.setAttribute('controls', '');
            //this.renderReplayButton();
            this.renderControl();
        } else if (this.data.video.control == 2) {
            this.renderSpecialControl();
        }
        
        this.videoContainer.appendChild(this.video);
        
        /* cover image */
        this.renderCoverImage();
        /* ending image */
        this.renderEndingImage();
        /* clickthrough */
        this.renderClickthrough();
        
        this.content.appendChild(this.videoContainer);
    },
    renderVideo : function () {
        /* render video */
        this.video = document.createElement('video')
        this.video.id = 'video';
        this.video.controller = true;
        this.video.innerHTML = 
            '<source src="' + this.data.video.src.mp4 + '" type="video/mp4" />\
            <source src="' + this.data.video.src.webm + '" type="video/webm"/>\
            <source src="' + this.data.video.src.ogg + '" type="video/ogg" />';
        this.video.width = this.data.video.w;
        this.video.height = this.data.video.h; 
        /* set autoplay */
        if (this.autoplay == 1 && this.data.video.coverImage.src == '') {
            this.video.setAttribute('autoplay', '');
        }
        /* mute by default */
        if ((this.autoplay == 1 && this.data.video.coverImage.src == '') || this.autoplay == 2) {
            this.video.setAttribute('muted', '');
        } else {
            this.video.setAttribute('muted', '');
        }
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
    renderClickthrough : function () {
        /*
        if (this.data.video.clickthrough.txt != '' && this.data.video.clickthrough.lpUrl != '') {
            this.clickthrough = document.createElement('div');
            this.clickthrough.height = '25';
            this.clickthrough.id = 'clickthrough-container-' + this.id;
            this.clickthrough.className = 'clickthrough-container';
                    
            this.clickthrough.innerHTML = '<span>' + this.data.video.clickthrough.txt + '</span><img src="images/openlink.png"/>';
        
            this.videoContainer.appendChild(this.clickthrough);
        }
        */
        if (this.data.video.clickthrough.lpUrl != '') {
            this.clickthrough = document.createElement('div');
            this.clickthrough.height = '25';
            this.clickthrough.id = 'clickthrough-container-' + this.id;
            this.clickthrough.className = 'clickthrough-container';
            
            this.videoContainer.appendChild(this.clickthrough);
        }
    },
    renderReplayButton : function () {
        this.replayBtn = document.createElement('div');
        this.replayBtn.id = 'control-replay-' + this.id;
        this.replayBtn.className = 'control-replay';
        this.replayBtn.innerHTML = '<img src="images/replay.png"/>';
        
        this.videoContainer.appendChild(this.replayBtn);
    },
    renderControl : function () {
        
        this.control.audio = document.createElement('div');
        this.control.audio.id = 'default-control-audio-container-' + this.id;
        this.control.audio.className = 'default-control-audio-container';
        this.control.audio.innerHTML = 
            '<img src="images/mute.png" class="dc-mute "/> \
             <img src="images/unmute.png" class="dc-unmute"/>';
        
        
        this.control.play = document.createElement('div');
        this.control.play.id = 'default-control-play-container-' + this.id;
        this.control.play.className = 'default-control-play-container';
        this.control.play.innerHTML = 
            '<img src="images/play.png" class="dc-play"/> \
             <img src="images/pause.png" class="dc-pause"/>';
        
        
        this.control.replay = document.createElement('div');
        this.control.replay.id = 'default-control-replay-container-' + this.id;
        this.control.replay.className = 'default-control-replay-container';
        this.control.replay.innerHTML = 
            '<img src="images/replay.png" class="dc-replay"/> \
             <svg width="32" height="32"><g> \
                <circle id="circle" class="circle_animation" r="13.971398" cy="16" cx="16" stroke-width="4" stroke="#6fdb6f" fill="none"/> \
             </g></svg>';
        
        this.videoContainer.appendChild(this.control.audio);
        this.videoContainer.appendChild(this.control.play);
        this.videoContainer.appendChild(this.control.replay);
        
    },
    /* 
    * control in the middle, show - 
    * play button when the video is not play 
    * mute/unmute button when the video is playing 
    * replay button when the video end
    */
    renderSpecialControl : function () {
        this.specialControl = document.createElement('div');
        this.specialControl.id = 'special-control-' + this.id;
        this.specialControl.className = 'special-control';
        this.specialControl.innerHTML = 
            '<img src="images/play.png" class="spc-play spc-controller"/> \
             <img src="images/mute.png" class="spc-mute spc-controller"/> \
             <img src="images/unmute.png" class="spc-unmute spc-controller"/> \
             <img src="images/replay.png" class="spc-replay spc-controller"/>';
        
        this.videoContainer.appendChild(this.specialControl);
    },
    
    
    
    events : function () {
        
        var _this = this;
        
        if (!this.data.video.mobile) {
            this.eventsVideoSetter();
        }
        
        /* cover image */
        this.eventsCoverImage();
        /* clickthrough */
        this.eventsClickthrough();
        /* replay */
        //this.eventsReplayBtn();
        /* special control */
        //this.eventsSpecialControl();
        /* control */
        this.eventsControl();
        
        this.video.addEventListener('play', function () {
            /* update video state */
            _this.videoState = 1;
            /* tracker */
            _this.tracker({
                type : 'video_play'
            });
            
            _this.playTimeTracking = setInterval(function(){
                _this.trackPlayTime();
            }, 500);
        });
        this.video.addEventListener('pause', function () {
            
            /* video end will trigger pause event, so will need to check the time */
            if (_this.video.currentTime < _this.video.duration) {
                /* update video state */
                _this.videoState = 2;
                
                /* tracker */
                _this.tracker({
                    type : 'video_pause'
                });
            }
        });
        
        this.video.addEventListener('ended', function () {
            /* update video state */
            _this.videoState = 3;
            /* tracker */
            _this.tracker({
                type : 'video_play_100'
            });
            /* tracker */
            _this.tracker({
                type : 'video_ended'
            });
            /* ending image */
            _this.eventsEndingImage();
            /* stop play time tracking */
            clearInterval(_this.playTimeTracking)
        })
        
        /* listen to post message */
        nj.fn.listen({
            callback : function (resp) { console.log(resp);
                /* inview */
                if (resp.auth == 'inview' && _this.autoplay == 2) {
                    _this.video.play();
                }
                
                /* outview */
                if (resp.auth == 'outview' && _this.autoplay == 2) {
                    _this.video.pause();
                }
                
                /* close exp */
                if (resp.auth == 'closeExpandable' ) {
                    _this.video.stop();
                }
            }
        });
        
    },
    eventsVideoSetter : function () {
        var _this = this;
        /* mute setter */
        this.video.mute = function () {
            _this.video.muted = true;
        }
        /* unmute setter */
        this.video.unmute = function () {
            _this.video.muted = false;
        }
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
                _this.linkOpener({
                    url : _this.data.video.coverImage.lpUrl
                });
                
                e.target.style.display = 'none';
            }
            /* click event for cover image */
            this.coverImage.addEventListener('click', fn[this.data.video.coverImage.action])
        }
    },
    eventsEndingImage : function () {
        var _this = this;
        
        if (this.endingImage != '') {
            this.endingImage.style.display = 'block';
            
            this.endingImage.addEventListener('click', function () {
                _this.linkOpener({
                    url : _this.data.video.endingeImage.lpUrl
                });
            });
            
            this.video.addEventListener('play', function () {
                _this.endingImage.style.display = 'none';
            });
        }
    },
    eventsClickthrough : function () {
        var _this = this;
        
        if (this.clickthrough != '') {
            this.clickthrough.addEventListener('click', function () {
                _this.linkOpener({
                    url : _this.data.video.clickthrough.lpUrl
                });
            });
            /*
            this.video.addEventListener('play', function () {
                // hide txt after video played for 5 secs 
                setTimeout(function () {
                    _this.clickthrough.querySelector('span').style.display = 'none';
                }, 5000);
            });
        */
        }
    }, 
    eventsReplayBtn : function () {
        var _this = this;
        
        if(this.replayBtn != '') {
            /* ended, show replay */
            this.video.addEventListener('ended', function () {
                _this.replayBtn.querySelector('img').style.display = 'block';
            });
            
            this.replayBtn.querySelector('img').addEventListener('click', function (e) {
                _this.video.muted = false;
                _this.video.play();
                e.target.style.display = 'none';
            })
        }
    },
    eventsControl : function () {
        var _this = this;
        if (this.control['play'] != 'undefined') {
            
            /* show play by default if it is non autoplay or inview autoplay */
            if (this.data.video.autoplay == 0) {
                this.control.play.querySelector('.dc-play').style.display = 'block';
            } 
            /* show pause by default if it is autoplay */
            else if (this.data.video.autoplay != 0 && this.data.video.autoplay == 2) {
                this.control.play.querySelector('.dc-pause').style.display = 'block';
            }
            this.control.audio.querySelector('.dc-mute').style.display = 'block';
            
            /* played, show mute/unmute */
            this.video.addEventListener('play', function () {
                /* play show/hide */
                _this.control.play.querySelector('.dc-play').style.display = 'none';
                _this.control.play.querySelector('.dc-pause').style.display = 'block';
                
                /* timer */
                var initialOffset = '88';
                document.querySelector('.circle_animation').style.strokeDashoffset = initialOffset;
                var interval = setInterval(function() {
                    
                    _this.control.replay.querySelector('.circle_animation').style.strokeDashoffset = initialOffset-(_this.video.currentTime*(initialOffset/_this.video.duration));

                    if (_this.video.currentTime == _this.video.duration) {
                        clearInterval(interval);
                    }
                    
                    if (_this.videoState != 1) {
                        clearInterval(interval);
                    }
                }, 1000);
            });
            /* pause, show replay */
            this.video.addEventListener('pause', function () {
                _this.control.play.querySelector('.dc-play').style.display = 'block';
                _this.control.play.querySelector('.dc-pause').style.display = 'none';
            });
            
            /* ended, show replay */
            this.video.addEventListener('ended', function () {
                _this.control.play.querySelector('.dc-play').style.display = 'none';
                _this.control.play.querySelector('.dc-pause').style.display = 'none';
                _this.control.replay.querySelector('.dc-replay').style.display = 'block';
                _this.control.replay.querySelector('svg').style.display = 'none';
            });
            
            /* control events */
            this.control.play.querySelector('.dc-play').addEventListener('click', function (e) {
                _this.video.play();
            })
            this.control.play.querySelector('.dc-pause').addEventListener('click', function (e) {
                _this.video.pause();
            })
            this.control.audio.querySelector('.dc-mute').addEventListener('click', function (e) {
                _this.video.unmute();
                /* hide mute */
                e.target.style.display = 'none';
                /* show unmute */
                _this.control.audio.querySelector('.dc-unmute').style.display = 'block';
            })
            this.control.audio.querySelector('.dc-unmute').addEventListener('click', function (e) {
                _this.video.mute();
                /* hide mute */
                e.target.style.display = 'none';
                /* show unmute */
                _this.control.audio.querySelector('.dc-mute').style.display = 'block';
            })
            this.control.replay.querySelector('.dc-replay').addEventListener('click', function (e) {
                
                /* tracker */
                _this.tracker({
                    type : 'video_replay'
                });
                _this.video.unmute();
                _this.video.play();
                /* hide replay */
                e.target.style.display = 'none';
                _this.control.replay.querySelector('svg').style.display = 'block';
                _this.control.play.querySelector('.dc-play').style.display = 'none';
                _this.control.play.querySelector('.dc-pause').style.display = 'block';
                _this.control.audio.querySelector('.dc-unmute').style.display = 'block';
                _this.control.audio.querySelector('.dc-mute').style.display = 'none';
            })
        }
    },
    /*
    * show play button when the video is not autoplay
    * show mute/unmute when video is playing
    * show replay when video is ended
    */
    eventsSpecialControl : function () {
        var _this = this; 
        
        if (this.specialControl != '') {
            
            var hideController = function () {
                var controller = _this.specialControl.querySelectorAll('.spc-controller');
                controller[0].style.display = 'none';
                controller[1].style.display = 'none';
                controller[2].style.display = 'none';
                controller[3].style.display = 'none';
            }
            
            /* check for autoplay */
            if (this.data.video.autoplay == 0) {
                hideController();
                this.specialControl.querySelector('.spc-play').style.display = 'block';
                this.specialControl.querySelector('.spc-play').addEventListener('click', function () {
                    _this.video.play();
                })
            }
            
            /* played, show mute/unmute */
            this.video.addEventListener('play', function () {
                hideController();
            });
            
            /* ended, show replay */
            this.video.addEventListener('ended', function () {
                hideController();
                _this.specialControl.querySelector('.spc-replay').style.display = 'block';
            });
            
            _this.video.addEventListener('mouseenter', function () {
                if (_this.videoState == 1) {
                    if (_this.video.muted) {
                        _this.specialControl.querySelector('.spc-unmute').style.display = 'block';
                    } else {
                        _this.specialControl.querySelector('.spc-mute').style.display = 'block';
                    }
                }
            })
            _this.video.addEventListener('mouseleave', function () {
                if (_this.videoState == 1) {
                    _this.specialControl.querySelector('.spc-replay').style.display = 'none';
                }
            })
            
            /* spc controller events */
            _this.specialControl.querySelector('.spc-mute').addEventListener('click', function () {
                _this.video.muted = true;
                hideController();
                _this.specialControl.querySelector('.spc-unmute').style.display = 'block';
            })
            _this.specialControl.querySelector('.spc-unmute').addEventListener('click', function () {
                _this.video.muted = false;
                hideController();
                _this.specialControl.querySelector('.spc-mute').style.display = 'block';
            })
            _this.specialControl.querySelector('.spc-replay').addEventListener('click', function () {
                _this.video.muted = false;
                _this.video.play();
            })
        }
    },
    
    
    
    
    linkOpener : function (options) {
        console.log(options.url);
    },
    tracker : function (options) {
        console.log(options.type)
    },
    extTracker : function (options) {
        /* js */
        if (this.data.video.extTrackers.type == 1) {
            
            var s = document.createElement('script');
            s.style.display = 'none';
            s.src = this.data.video.extTrackers[options.type];
            
            document.body.appendChild(s);
        } 
        /* img */
        else if (this.data.video.extTrackers.type == 2) {
            var i = document.createElement('img');
            i.style.width = '1px';
            i.style.height = '1px';
            i.style.display = 'none';
            i.src = this.data.video.extTrackers[options.type];
            
            document.body.appendChild(i);
        }
    },
    trackPlayTime : function () {
        var _this = this;
        var duration = this.video.duration;
        var currentTime = this.video.currentTime;
        
        if (currentTime >= duration) {
            /* tracker */
            _this.tracker({
                type : 'video_play_100'
            });
            /* stop play time tracking */
            clearInterval(_this.playTimeTracking)
        }
        else if (currentTime >= duration * 0.75) {
            /* tracker */
            _this.tracker({
                type : 'video_play_75'
            });
        }
        else if (currentTime >= duration * 0.5) {
            /* tracker */
            _this.tracker({
                type : 'video_play_50'
            });
        }
        else if (currentTime >= duration * 0.25) {
            /* tracker */
            _this.tracker({
                type : 'video_play_25'
            });
        }
    }
}

