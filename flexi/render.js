/* 
* freeflow render can the exactly same component with the templated version 
* EVENTS is not needed during ad creation, but might need it for the preview 
* still haven't thought of way to use it in preview yet, please feedback if you have
*/
var component = function (options) {
    this.content = document.querySelector(options.content.selector);
    this.data = options.data;
    
    /* variable which need to be manipulated for freeflow */
    this.l = 0;
    
    this.render();
    this.events();
}

component.prototype = {
    initialize : function () {},
    render : function () {
        
        this.slider = document.createElement('div');
        this.slider.className
            = 'slider';
        
        for (var i = 0; i < this.data.images.length; i++) {
            var img = '<img src="'+ this.data.images[i].src +'"/>';
            
            this.slider.innerHTML += img;
        }
        this.l = i;
        
        this.content.appendChild(this.slider);
    },
    events : function () {
        var _this = this;
        /* native javascript only */
        var i = 0;
        setInterval(function () {
            console.log();
            _this.slider.childNodes[i].style.display = 'none';
            
            i++;
            
            if (i >= _this.l) {
                i = 0;
            }
            
            _this.slider.childNodes[i].style.display = 'block';
            
        }, 2000);
    }
}

/* 
* please refer to media.component.js for the parameters which will be passed in 
* there wont be any changes in the params 
*/
/* Initializing */
new component ({
    container : $('#test'), //optional (freeflow)
    id : 1,
    content : $('#test'),
    controller : null, //optional (freeflow)
    sdk : null, //optional (freeflow)
    tab : 'tab1',
    layer : 'layer1', //optional (freeflow)
    data : {
        images : [
            {src:'https://unanchor-blog.s3.amazonaws.com/2011/04/destination-seoul.jpg',click:'http://www.landing.com'},
            {src:'http://www.compares.sg/wp-content/uploads/2015/08/seoul-south-korea-300x250.jpg',click:'http://www.test.com'},
            {src:'http://data.whicdn.com/images/165572428/superthumb.jpg',click:'http://www.example.com'}
        ]
    }
})