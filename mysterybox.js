window.MYSTERYBOX = window.MYSTERYBOX || (function() {
    "use strict";

    var 

        /* prevent calls to console.log from throwing an error in browsers that don't support it */
        console = window.console || {log:function(){ return; }},

        /* shortcut saves extra prototype tree traversals */
        hasOwnProp = Object.prototype.hasOwnProperty,

        /* 
            Extend: helper function for copying parameters from one object to another.
            Not a "full" object copy - only useful for copying simple, flat hashes.
        */
        extend = function(obj, extension, overwrite){
            var i, j, key;
            if (overwrite !== false) {
                overwrite = true;
            }
            for (key in extension){
                if (hasOwnProp.call(extension, key)) {

                    if (obj[key] === undefined || overwrite) {
                        obj[key] = extension[key];
                    }

                    
                }
            }
        };

    function box(options) {
        var 
            elmStyle,
            elmDimension = {'x':0,'y':0};

        this.options = {
            msgLineMaxWidth: 80,
            cssText: "font-family: \"Courier New\", Courier, monospace;font-size:14px;line-height:17px;font-weight:normal;",
            charWidth: 8.4,
            charHeight: 17,
            message: "The quick brown fox jumped over the two lazy dogs",
            domElmId: ""
        };
        extend(this.options, options);

        this.events = {
            /* do event constructors work in newer version of IE? */
            "mb_charUpdated": new Event('mb_charUpdated'),
            "mb_allCharsUpdated": new Event('mb_allCharsUpdated'),
            "mb_init": new Event('mb_init')
        };

        if (this.options.domElmId == "") {
            this.domElm = document.getElementsByTagName("body")[0];
        } else {
            this.domElm = document.getElementById(this.options.domElmId);
        }

        this.domElm.style.cssText += "display:block;unicode-bidi:embed;white-space:pre;word-wrap: break-word;font-family:monospace;";
        this.domElm.style.cssText += this.options.cssText;

        elmStyle = window.getComputedStyle(this.domElm);
        extend(elmDimension, {
            "x": this.domElm.clientWidth - elmStyle.getPropertyValue('padding-left').match(/\d+/)[0] - elmStyle.getPropertyValue('padding-right').match(/\d+/)[0],
            "y": this.domElm.clientHeight - elmStyle.getPropertyValue('padding-top').match(/\d+/)[0] - elmStyle.getPropertyValue('padding-bottom').match(/\d+/)[0]
        });

        this.cols = Math.floor(elmDimension.x/this.options.charWidth);
        this.rows = Math.floor(elmDimension.y/this.options.charHeight);

        this.total = this.rows * this.cols;

        this.buffer = [];
        this.cleanChars = [];
        this.msg = this.options.message;

        this.init();
    }

    box.prototype.init = function(msg) {
        if (msg !== undefined) {
            this.msg = msg;
        }
        this.domElm.innerHTML = this.getRandom();
        this.populateBuffer();

        this.trigger("mb_init");
    }

    box.prototype.getRandom = function() {
        var str = "";
        for (var i=0;i<this.total;i++) {
            str += this.getRandLatin();
        }
        return str;
    }

    box.prototype.resolve = function(threads) {
        if (threads === undefined) {
            threads = Math.ceil(this.total/250)
        }
        for (var i=0;i<this.total;i++) {
            this.cleanChars[i] = i;
        }
        for (var i=0;i<threads;i++) {
            this.resolveChar(true);
        }
    }

    box.prototype.dissolve = function(threads) {
        if (threads === undefined) {
            threads = Math.ceil(this.total/250)
        }
        for (var i=0;i<this.total;i++) {
            this.cleanChars[i] = i;
        }

        this.buffer = this.getRandom();

        for (var i=0;i<threads;i++) {
            this.resolveChar(true);
        }
    }

    box.prototype.resolveChar = function(recurse) {
        if (this.cleanChars.length) {
            var self = this,
                j = Math.floor(Math.random() * this.cleanChars.length),
                i = this.cleanChars[j];

            this.cleanChars.splice(j,1);

            this.domElm.innerHTML = this.domElm.innerHTML.substring(0,i) + this.buffer[i] + this.domElm.innerHTML.substring(i+1);

            if (recurse !== undefined && recurse) {
                setTimeout(function() {self.resolveChar(true)}, 0);
            }

            this.trigger("mb_charUpdated");
        } else {
            this.trigger("mb_allCharsUpdated");
        }
    }

    box.prototype.populateBuffer = function() {
        var msgRows = Math.ceil(this.msg.length/Math.min(this.options.msgLineMaxWidth, this.cols)),
            rowLength = Math.ceil(this.msg.length/msgRows),
            msgArr = this.msg.split(" "),
            cursor = Math.floor((this.rows - msgRows)/2) * this.cols,
            line = "",
            nextLen;

        /* initialize arrays */
        for (var i=0;i<this.total;i++) {
            this.buffer[i] = "\u0020";
        }

        while (msgArr.length > 0) {
            line += msgArr[0];
            msgArr.splice(0,1);
            try {
                nextLen = msgArr[0].length;
            } catch (e) {
                nextLen = 0;
            }

            if (line.length >= rowLength || line.length + nextLen > this.cols || nextLen == 0) {
                // write line to buffer
                cursor += Math.floor((this.cols - line.length)/2)  //pad left

                for (i=0;i<line.length;i++) {
                    this.buffer[cursor++] = line.charAt(i);
                }

                cursor += Math.ceil((this.cols - line.length)/2)  //pad right
                line = "";
            } else {
                line += " ";
            }
        }
    }

    box.prototype.getRandLatin = function() {
        //return String.fromCharCode(0x30A0 + Math.random() * (0x30FF-0x30A0+1));   //katakana
        //return String.fromCharCode(0x0041 + Math.random() * (0x005A-0x0041+1));   //uppercase A-Z
        return String.fromCharCode(0x0061 + Math.random() * (0x007A-0x0061));      //lowercase a-z
    }

    box.prototype.trigger = function(eventName) {
        this.domElm.dispatchEvent(this.events[eventName]);
    }

    /*
    * expose box class
    */
    return box;

}());
