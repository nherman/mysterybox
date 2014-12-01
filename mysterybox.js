/***
 * MYSTERYBOX
 * Fill up a DOM element with random characters then have them "resolve" into something non-random
 */

window.MYSTERYBOX = window.MYSTERYBOX || (function() {
    "use strict";

    var 

        /* prevent calls to console.log from throwing an error in browsers that don't support it */
        console = window.console || {log:function(){ return; }},

        /* shortcut saves extra prototype tree traversals */
        hasOwnProp = Object.prototype.hasOwnProperty,

        /*
         * Box emits the following events: character init, updated, all characters updated
         */
        events = {
            /* do event constructors work in newer version of IE? */
            "mb_charUpdated": new Event('mb_charUpdated'),
            "mb_allCharsUpdated": new Event('mb_allCharsUpdated'),
            "mb_init": new Event('mb_init'),
            "mb_init_msg": new Event('mb_init_msg')
        },

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
        },

        /* return a random latin character */
        getRandLatin = function() {
            //return String.fromCharCode(0x30A0 + Math.random() * (0x30FF-0x30A0+1));   //katakana
            //return String.fromCharCode(0x0041 + Math.random() * (0x005A-0x0041+1));   //uppercase A-Z
            return String.fromCharCode(0x0061 + Math.random() * (0x007A-0x0061));      //lowercase a-z
        },

        /* dispatch an event */
        trigger = function(mb, eventName) {
            mb.domElm.dispatchEvent(events[eventName]);
        },

        /*
         * populateMsgBuffer
         * insert all characters from msg into msgBuffer.
         * format the text based on configuration
         */
        populateMsgBuffer = function(mb) {
            var msgRows = Math.ceil(mb.msg.length/Math.min(mb.options.msgLineMaxWidth, mb.cols)),
                rowLength = Math.ceil(mb.msg.length/msgRows),
                msgArr = mb.msg.split(" "),
                cursor = Math.floor((mb.rows - msgRows)/2) * mb.cols,
                line = "",
                nextLen;

            /* initialize arrays */
            for (var i=0;i<mb.total;i++) {
                mb.msgBuffer[i] = "\u0020";
            }

            while (msgArr.length > 0) {
                line += msgArr[0];
                msgArr.splice(0,1);
                try {
                    nextLen = msgArr[0].length;
                } catch (e) {
                    nextLen = 0;
                }

                if (line.length >= rowLength || line.length + nextLen > mb.cols || nextLen == 0) {
                    // write line to msgBuffer
                    cursor += Math.floor((mb.cols - line.length)/2)  //pad left

                    for (i=0;i<line.length;i++) {
                        mb.msgBuffer[cursor++] = line.charAt(i);
                    }

                    cursor += Math.ceil((mb.cols - line.length)/2)  //pad right
                    line = "";
                } else {
                    line += " ";
                }
            }
        },

        /*
         * getCharacterDimensions
         * For a given DOM element and character set, return the height and
         * width of a average character in the element context
         */
        getCharacterDimensions = function(elm, alpha) {
            var rect,
                returnObj = {},
                span = document.createElement("span");

            /* create an element to test */
            span.style.cssText += "visibility:hidden;position:absolute;top:-1000px;left:-1000px;";
            /* since computed line height seems to always map exactly to CSS line height using two lines is probably uncecessary */
            span.innerHTML = alpha + "<br>" + alpha; 
            elm.appendChild(span);

            /* get height and width */
            try {
                rect = span.getBoundingClientRect()
                returnObj.w = rect.width/alpha.length;
                returnObj.h = rect.height/2;
            } catch(e) {
                /* rect.width/height might not exist in older browsers. */
            }

            /* clean up */
            elm.removeChild(span);

            return returnObj;

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
            elmDimension = {'x':0,'y':0};

        this.options = {
            msgLineMaxWidth: 80,
            cssText: "font-family: \"Courier New\", Courier, monospace;font-size:14px;line-height:17px;font-weight:normal;",
            charWidth: 8,
            charHeight: 17,
            message: "The quick brown fox jumped over the two lazy dogs",
            domElmId: ""
        };
        extend(this.options, options);

        /*
         * Get DOM element
         */
        if (this.options.domElmId == "") {
            this.domElm = document.getElementsByTagName("body")[0];
        } else {
            this.domElm = document.getElementById(this.options.domElmId);
        }

        /*
         * Set element styles
         *
         * Force words to break and wrap instead of overflowing.
         * Preserve white-space
         * http://jsbin.com/bulletproof-responsive-pre/2/edit
         * letter-spacing: -0.4px seems to normalize the display across browsers... I'm not sure why
         */
        this.domElm.style.cssText += this.options.cssText;
        this.domElm.style.cssText += "display:block;unicode-bidi:embed;word-break:break-all;word-wrap:break-word;white-space:pre;white-space: -moz-pre-wrap;white-space:pre-wrap;letter-spacing:-0.4px;";

        /*
         * Get box size
         */
        elmStyle = window.getComputedStyle(this.domElm);
        extend(elmDimension, {
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
        this.cols = Math.floor(elmDimension.x/charDimension.w);
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
        trigger(this, "mb_init");

    }

    /*
     * initMsg
     * set msg and populate "resolved" msgBuffer
     */
    Box.prototype.initMsg = function(msg) {
        if (msg !== undefined) {
            this.msg = msg;
        }
        populateMsgBuffer(this);
        trigger(this, "mb_init_msg");
    }

    /*
     * initRandom
     * fill the DOM element with random characters
     */
    Box.prototype.initRandom = function(msg) {
        this.buffer = this.getRandom();
        this.render();
    }

    /*
     * render
     * push changes in the buffer to DOM
     */
    Box.prototype.render = function() {
        this.domElm.innerHTML = this.buffer;
    }

    /*
     * renderMsg
     * resolve entire buffer instantly
     */
    Box.prototype.renderMsg = function() {
        var i = 0;
        this.buffer = "";
        for(;i<this.msgBuffer.length;i++) {
            this.buffer += this.msgBuffer[i];
        }
        this.render();
    }

    /*
     * render
     * push changes in the buffer to DOM
     */
    Box.prototype.render = function() {
        this.domElm.innerHTML = this.buffer;
    }

    /*
     * get a string of random characters the length of the msgBuffer
     */
    Box.prototype.getRandom = function() {
        var str = "";
        for (var i=0;i<this.total;i++) {
            str += getRandLatin();
        }
        return str;
    }


    /*
     * resolveMatrix
     * effect similar to code displays in the matrix movies
     * would probably look better using katakana
     */
    Box.prototype.resolveMatrix = function(options) {
        var self = this,
            opt = {
                "threads": 1,
                "intervalMilliseconds": 50,
                "updateFunction": (function() {
                    var ci,
                        /* shared counter tracks character updates */
                        charUpdateCount = 0,
                        /* shared array of column indexes tracks which columns are already being resolved */
                        cleanCols = [],
                        /* milliseconds to wait before recursing */
                        recursionDelay = 50;

                    /* populate cleanCols */
                    for (ci = 0; ci < self.cols; ci++) {
                        cleanCols[ci] = ci;
                    }

                    function resolveMatrix(intervalHandle, row, col) {
                        var next, i, characterIndex;

                        /* if col is undefined then attempt to begin resolving a new column */
                        if (col === undefined) {
                            if (cleanCols.length) {
                                /* get a random column */
                                i = Math.floor(Math.random() * cleanCols.length);
                                col = cleanCols[i];
                                cleanCols.splice(i,1);
                            } else {
                                /* all columns are being resolved - do not start any more recursion stacks */
                                clearInterval(intervalHandle);
                                return;
                            }
                        }

                        /* if row is not defined then start with row 0 */
                        row = row || 0;

                        /* figure out the index of the character to resolve */
                        characterIndex = (row * self.cols) + col;

                        /* replace char at row / col with char from buffer */
                        self.buffer = self.buffer.substring(0,characterIndex) + self.msgBuffer[characterIndex] + self.buffer.substring(characterIndex+1);
                        charUpdateCount++;
                        trigger(self, "mb_charUpdated");


                        /* not done with the column yet - recurse */
                        if (++row != self.rows) {
                            setTimeout(function() {
                                resolveMatrix(intervalHandle, row, col);
                            },recursionDelay);
                        } else if (charUpdateCount >= self.total) {
                            trigger(self, "mb_allCharsUpdated");
                        }

                    }

                    return resolveMatrix;
                })()
            };
        extend(opt, options);

        this.loop(opt);
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
                    self.resolveChar(getRandLatin());
                }
            };
        extend(opt, options);

        this.loop(opt);
    }

    /*
     * loop
     * general function for spawning loops the iterate through all characters in the msgBuffer.
     * performs a "resolve" by default
     *
     * threads: # of intervals to spawn. default is 1 per 250 characters in msgBuffer
     * updateFunction: function that updates the buffer - usually by calling resolveChar
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
                "threads": Math.ceil(this.total/250),
                "intervalMilliseconds": 0,
                "renderEventName": "mb_charUpdated",
                "clearEventName": "mb_allCharsUpdated",
                "renderFrequency": 1,
                "updateFunction": function() {
                    self.resolveChar();
                },
                "callback": function() {}
            };
            extend(opt, options);

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
                if (typeof opt.callback === "function") {
                    opt.callback();
                }
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
     * resolveChar
     * randomly select a "clean" character from the DOM element and replace
     * it with the matching character from the msgBuffer OR the character passed in
     */
    Box.prototype.resolveChar = function(c) {
        if (this.cleanChars.length) {
            var j = Math.floor(Math.random() * this.cleanChars.length),
                i = this.cleanChars[j];

            this.cleanChars.splice(j,1);

            if (c === undefined) {
                c = this.msgBuffer[i];
            }
            this.buffer = this.buffer.substring(0,i) + c + this.buffer.substring(i+1);

            trigger(this, "mb_charUpdated");
        } else {
            trigger(this, "mb_allCharsUpdated");
        }
    }

    /*
    * expose Box class
    */
    return Box;

}());
