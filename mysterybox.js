/***
 * MYSTERYBOX
 * https://github.com/nherman/mysterybox
 * Fill up a DOM element with random characters then have them "resolve" into something non-random
 */

window.MYSTERYBOX = window.MYSTERYBOX || (function() {
    "use strict";

    /*
     * var block contains global private variables and helper functions
     */
    var 

        /* prevent calls to console.log from throwing an error in browsers that don't support it */
        console = window.console || {log:function(){ return; }},

        /* shortcut saves extra prototype tree traversals */
        hasOwnProp = Object.prototype.hasOwnProperty,

        /*
         * populateMsgBuffer
         * insert all characters from msg into msgBuffer.
         * format the text based on configuration
         */
        populateMsgBuffer = function(mb, preserve_whitespace) {
            var cursor = 0;

            function writeLine(line) {
                var i=0,
                    pad = (mb.cols - line.length)/2;

                cursor += Math.floor(pad)  //pad left
                for (;i<line.length;i++) {
                    mb.msgBuffer[cursor++] = line.charAt(i);
                }
                cursor += Math.ceil(pad)  //pad right
            }

            function preserveWhitespace() {
                var msgArr = mb.msg.split(/\n/);

                cursor = Math.floor((mb.rows - msgArr.length)/2) * mb.cols;

                while (msgArr.length > 0) {
                    writeLine(msgArr[0]);
                    msgArr.splice(0,1);
                }
            }

            function ignoreWhitespace() {
                var msgRows = Math.ceil(mb.msg.length/Math.min(mb.options.msgLineMaxWidth, mb.cols)),
                    rowLength = Math.ceil(mb.msg.length/msgRows),
                    /* split message into words - preserve line breaks */
                    msgArr = mb.msg.replace(/\s+/g," ").replace(/\n/g, " LINEBREAK ").split(/\s/),
                    line = "",
                    nextLen;

                cursor = Math.floor((mb.rows - msgRows)/2) * mb.cols;

                while (msgArr.length > 0) {
                    if (msgArr[0] == "LINEBREAK") {
                        msgArr.splice(0,1);
                        nextLen = 0;
                    } else {
                        line += msgArr[0];
                        msgArr.splice(0,1);
                        try {
                            nextLen = msgArr[0].length;
                        } catch (e) {
                            nextLen = 0;
                        }
                    }

                    if (line.length >= rowLength || line.length + nextLen > mb.cols || nextLen == 0) {
                        // write line to msgBuffer
                        writeLine(line);
                        line = "";
                    } else {
                        line += " ";
                    }
                }
            }

            /* initialize arrays
             * Originally this populated msgBuffer with space characters (\u0020). However, Safari7.1 seems to
             * collapse leading spaces in blocks where the white-space style is set to 'pre-wrap.' Switching
             * to non-breaking space characters (\u00A0) seems to be a less fragile alternative.
             */
            for (var i=0;i<mb.total;i++) {
                mb.msgBuffer[i] = "\u00A0";
            }

            if (preserve_whitespace) {
                preserveWhitespace();
            } else {
                ignoreWhitespace();
            }
        },

        /*
         * getCharacterDimensions
         * For a given DOM element and character set, return the height and
         * width of a average character in the element context
         */
        getCharacterDimensions = function(elm, alpha) {
            var rect,
                r = {"cols":0},
                span = document.createElement("span");

            /* create an element to test */
            span.style.cssText += "visibility:hidden;";
            span.innerHTML = alpha; 
            elm.appendChild(span);

            try {
                /* get character height and width */
                rect = span.getBoundingClientRect()
                r.w = rect.width/alpha.length;
                r.h = parseFloat(elm.style.lineHeight, 10);

                /*
                    get total number of cols...
                    I would prefer to do this with math (i.e. element width / character width)
                    but that method becomes inaccurate for some reason if the browser zoom
                    level != 100%
                */
                r.cols = alpha.length;
                while (rect.height <= r.h) {
                    span.innerHTML += alpha;
                    r.cols += alpha.length;
                    rect = span.getBoundingClientRect();
                }
                while (rect.height > r.h) {
                    span.innerHTML = span.innerHTML.substring(0,span.innerHTML.length-1);
                    r.cols--;
                    rect = span.getBoundingClientRect();
                }

            } catch(e) {
                /* rect.width/height might not exist in older browsers. */
                return;
            }

            /* clean up */
            elm.removeChild(span);

            return r;

        },
        /* sample of latin characters */
        latinStr = "abcdefghijklmnopqrstuvqxyz";


    /*
     * Box
     * Primary class for managing the DOM element to be manipulated.  Contains
     * a variety of configurable defaults for controlling attributes of the
     * text:
     *
     *  
    */
    function Box(options) {
        var 
            elmStyle,
            charDimension = {'w':8.4,'h':17},
            elmDimension = {'x':0,'y':0},
            userAgent = window.navigator.userAgent;

        this.options = {
            msgLineMaxWidth: 80,
            cssText: "font-family: \"Courier New\", Courier, monospace;font-size:14px;line-height:17px;font-weight:normal;",
            message: "",
            domElmId: ""
        };
        Box.extend(this.options, options);

        /*
         * Get DOM element
         */
        if (this.options.domElmId == "") {
            this.domElm = document.getElementsByTagName("body")[0];
        } else {
            this.domElm = document.getElementById(this.options.domElmId);
        }

        /* clear element contents */
        this.domElm.innerHTML = "";        

        /*
         * Set element styles
         *
         * Force words to break and wrap instead of overflowing.
         * Preserve white-space
         * http://jsbin.com/bulletproof-responsive-pre/2/edit
         */
        this.domElm.style.cssText += this.options.cssText;
        this.domElm.style.cssText += "display:block;unicode-bidi:embed;word-break:break-all;word-wrap:break-word;white-space:pre;white-space: -moz-pre-wrap;";


        /* pre or pre-wrap?
           IE's implementation of pre-wrap is very picky about non-breaking
           spaces. It will insert a break ahead of the last character in a
           line that is not \u00A0. Other browser will maximize the number of
           characters in each line.

           Switching CSS white-space to "pre" for IE only seems to fix the
           issue. Sadly, other browsers don't render proprely using pre.
           Rather than re-factor the renderer to force line-breaks in the 
           right places I'm choosing to insert this litle hack.

           I couldn't figure out how to detect this issue directly so I'm
           forced to test for the IE user-agent string. <sad face> I've only
           tested this in IE11 so it's possible I'm breaking things on older
           versions <shrug>
         */

        if (userAgent.indexOf("MSIE ") == -1 && userAgent.indexOf("Trident/") == -1) {
            this.domElm.style.cssText += "white-space:pre-wrap;"
        }

        /*
         * Get box size
         */
        elmStyle = window.getComputedStyle(this.domElm);
        Box.extend(elmDimension, {
            "x": this.domElm.clientWidth - elmStyle.getPropertyValue('padding-left').match(/\d+/)[0] - elmStyle.getPropertyValue('padding-right').match(/\d+/)[0],
            "y": this.domElm.clientHeight - elmStyle.getPropertyValue('padding-top').match(/\d+/)[0] - elmStyle.getPropertyValue('padding-bottom').match(/\d+/)[0]
        });

        /*
         * Get character dimensions and calculate:
         *  number of text columns required
         *  number of text rows required
         *  total number of characters required
         */
        charDimension = getCharacterDimensions(this.domElm, latinStr);

        this.cols = charDimension.cols || Math.round(elmDimension.x/charDimension.w);;
        this.rows = Math.floor(elmDimension.y/charDimension.h);
        this.total = this.rows * this.cols;

        /* msgBuffer contains formated message text */
        this.msgBuffer = [];

        /*
         * buffer mirrors displayed text.  loops will make changes to buffer then push buffer 
         * content to the domElement periodically
         */
        this.buffer = this.domElm.innerHTML;

        /*
         * cleanChars array informs all processes in namespace of which characters
         * are still "clean" during a loop. when cleanChars.length goes to zero 
         * then the loop will break
         */
        this.cleanChars = [];

        /* copy unformatted message to preserve original user-specified default message */
        this.msg = this.options.message;


        /*
         * initialze msgBuffer with message
         */
        this.initMsg();

        /* trigger 'init' event */
        this.trigger("mb_init");

    }

    /*
     * Class Methods
     */

    /*
        Box emits the following events:
        init, message updated, character updated, all characters updated
    */
    Box.events = {
        
        "mb_charUpdated": document.createEvent("CustomEvent"),
        "mb_allCharsUpdated": document.createEvent("CustomEvent"),
        "mb_init": document.createEvent("CustomEvent"),
        "mb_init_msg": document.createEvent("CustomEvent")

    };
    Box.events.mb_charUpdated.initEvent('mb_charUpdated',false,true);
    Box.events.mb_allCharsUpdated.initEvent('mb_allCharsUpdated',false,true);
    Box.events.mb_init.initEvent('mb_init',false,true);
    Box.events.mb_init_msg.initEvent('mb_init_msg',false,true);

    /* 
        Extend: helper function for copying parameters from one object to another.
        Not a "full" object copy - only useful for copying simple, flat hashes.
    */
    Box.extend = function(obj, extension, overwrite){
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

    /* return a random latin character */
    Box.getRandLatin = function() {
        //return String.fromCharCode(0x30A0 + Math.random() * (0x30FF-0x30A0+1));   //katakana
        //return String.fromCharCode(0x0041 + Math.random() * (0x005A-0x0041+1));   //uppercase A-Z
        return String.fromCharCode(0x0061 + Math.random() * (0x007A-0x0061));      //lowercase a-z
    };

    /* execute a callback function using standard options */
    Box.callback = function(options) {
        if (typeof options.callback === "function") {
            if (options.callbackDelayMilliseconds) {
                setTimeout(function() {
                    options.callback();
                }, options.callbackDelayMilliseconds);
            } else {
                options.callback();
            }
        }
    };
    

    /*
     * Instance Methods
     */

    /*
     * render
     * push changes in the buffer to DOM
     */
    Box.prototype.render = function() {
        this.domElm.innerHTML = this.buffer.replace('<','&lt;').replace('>','&gt;');
    }

    /* 
     * trigger
     * dispatch an event
     */
    Box.prototype.trigger = function(eventName) {
        this.domElm.dispatchEvent(Box.events[eventName]);
    };

    /*
     * initMsg
     * set msg and populate "resolved" msgBuffer
     */
    Box.prototype.initMsg = function(msg, preserve_whitespace) {
        if (msg !== undefined) {
            this.msg = msg;
        }
        if (preserve_whitespace !== true) {
            preserve_whitespace = false;
        }

        populateMsgBuffer(this, preserve_whitespace);
        this.trigger("mb_init_msg");
    }

    /*
     * initRandom
     * fill the DOM element with random characters
     */
    Box.prototype.initRandom = function(options) {
        var self = this,
            opt = {
                "callbackDelayMilliseconds": 0,
                "callback": ""
            };
        Box.extend(opt, options);

        this.buffer = this.getRandom();
        this.render();

        /* execute callback function */
        Box.callback(opt);
    }

    /*
     * renderMsg
     * resolve entire buffer instantly
     */
    Box.prototype.renderMsg = function(options) {
        var self = this,
            i = 0,
            opt = {
                "callbackDelayMilliseconds": 0,
                "callback": ""
            };
        Box.extend(opt, options);

        this.buffer = "";
        for(;i<this.msgBuffer.length;i++) {
            this.buffer += this.msgBuffer[i];
        }
        this.render();

        /* execute callback function */
        Box.callback(opt);
    }

    /*
     * get a string of random characters the length of the msgBuffer
     */
    Box.prototype.getRandom = function() {
        var str = "";
        for (var i=0;i<this.total;i++) {
            str += Box.getRandLatin();
        }
        return str;
    }

    /*
     * resolve
     * replace all charactes in the DOM element with the contents of the msgBuffer
     */
    Box.prototype.resolve = function(options) {
        this.loop(options);
    }

    /*
     * dissolve
     * replace all charactes in the DOM element with random characters
     */
    Box.prototype.dissolve = function(options) {
        var self = this,
            opt = {
                "updateFunction": function() {
                    self.updateChar(Box.getRandLatin());
                }
            };
        Box.extend(opt, options);

        this.loop(opt);
    }

    /*
     * loop
     * general function for spawning loops the iterate through all characters in the msgBuffer.
     * performs a "resolve" by default
     *
     * threads: # of intervals to spawn. default is 1 per 250 characters in msgBuffer
     * updateFunction: function that updates the buffer - usually by calling updateChar
     * renderFrequency: function to run on each iteration
     * callback: function to run after loop is complete
     * renderEventName: event that initiates render
     * clearEventName: event that will cancel intervals
     */
    Box.prototype.loop = function(options) {
        var
            self = this,
            intervals = [],
            counters = [],
            totalCount = 0,
            opt = {
                "charactersPerThread": 250,
                "intervalMilliseconds": 0,
                "callbackDelayMilliseconds": 0,
                "renderEventName": "mb_charUpdated",
                "clearEventName": "mb_allCharsUpdated",
                "renderFrequency": 1,
                "updateFunction": function() {
                    self.updateChar();
                },
                "callback": ""
            };
            Box.extend(opt, options);

            /* figure out how many threads we want */
            if (opt.threads === undefined) {
                opt.threads = Math.ceil(this.total/opt.charactersPerThread);
            }

            /*
             * event listener to render display on buffer update
             * only call render after a certain number of characters have been replaced
             */
            function renderFunc() {
                if (!(totalCount++ % opt.renderFrequency)) {
                    self.render();
                }
            };

            /* event listener to clear intervals when buffer update is complete */
            function clearFunc() {

                /* clear all event listeners */
                self.domElm.removeEventListener(opt.renderEventName, renderFunc);
                self.domElm.removeEventListener(opt.clearEventName, clearFunc);

                /* do a render just in case */
                self.render();

                /* clear all intervals */
                for (var i=0; i<intervals.length; i++) {
                    clearInterval(intervals[i]);
                }

                /* execute callback function */
                Box.callback(opt);
            };
            
        /* attach event listeners */
        this.domElm.addEventListener(opt.renderEventName, renderFunc, false);
        this.domElm.addEventListener(opt.clearEventName, clearFunc, false);

        /* initialize array to keep track of characters that haven't been updated */
        for (var i=0;i<this.total;i++) {
            this.cleanChars[i] = i;
        }

        /* 
         * start intervals
         * wrap interval payload in a closure to make it aware of it's own
         * index in the intervals array, and allow it to maintain a counter.
         * This allow it to cancel itself if an infinite loop bug occurs.
         */
        for (var i=0;i<opt.threads;i++) {
            intervals[i] = setInterval((function(intervalIndex) {
                var counter = 0;
                return function() {
                    /* safety net - make sure we don't have a bug that creates an infinite loop */
                    if (counter++ > self.total) {
                        clearInterval(intervals[intervalIndex]);
                        console.log("killing thread");
                    }

                    /* 
                     * call update function to change the display
                     * pass in interval handle to allow update funtion to override loop
                     */
                    opt.updateFunction(intervals[i]);
                }
            })(i), opt.intervalMilliseconds);
        }
    }

    /*
     * updateChar
     * randomly select a "clean" character from the DOM element and replace
     * it with the matching character from the msgBuffer OR the character passed in
     */
    Box.prototype.updateChar = function(c) {
        if (this.cleanChars.length) {
            var j = Math.floor(Math.random() * this.cleanChars.length),
                i = this.cleanChars[j];

            this.cleanChars.splice(j,1);

            if (c === undefined) {
                c = this.msgBuffer[i];
            }
            this.buffer = this.buffer.substring(0,i) + c + this.buffer.substring(i+1);

            this.trigger("mb_charUpdated");
        } else {
            this.trigger("mb_allCharsUpdated");
        }
    }

    /*
    * expose Box class
    */
    return Box;

}());
