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
            elmDimension = {'x':0,'y':0};

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
        this.domElm.style.cssText += "display:block;unicode-bidi:embed;word-break:break-all;word-wrap:break-word;white-space:pre;white-space: -moz-pre-wrap;white-space:pre-wrap;";

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
//        this.initMsg();

        /* trigger 'init' event */
//        this.trigger("mb_init");

    }

    /*
     * Class Methods
     */

    /*
        Box emits the following events:
        init, message updated, character updated, all characters updated
    */
    Box.events = {
        "mb_charUpdated": document.createEvent("CustomEvent")
    };
    Box.events.mb_charUpdated.initEvent('mb_charUpdated',false,true);


    return Box;

}());
