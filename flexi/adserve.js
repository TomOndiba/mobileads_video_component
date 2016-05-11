/*
* freeflow ad serving don't need to render, as it is already rendered in the html files
* so only need to add events & actions if necessary 
*/
var component = function (options) {
    
    /* variable which need to be manipulated for freeflow */
    /* get the necessary value for these value, as these values are supply by render */
    this.slider = document.querySelector('#ff_layer_' + options.layer + ' .slider')
    this.l = this.slider.childNodes.length;
    
    this.events();
}

component.prototype = {
    initialize : function () {},
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

/* Initializing */
new component ({
    id : 1,
    tab : 'tab1',
    layer : 'layer1', //optional (freeflow)
})