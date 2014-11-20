            window.MYSTERYBOX = window.MYSTERYBOX || (function() {
                "use strict";

                var 

                    /* prevent calls to console.log from throwing an error in browsers that don't support it */
                    console = window.console || {log:function(){ return; }},

                    /* shortcut saves extra prototype tree traversals */
                    hasOwnProp = Object.prototype.hasOwnProperty,

                    /* helper function returns true if passed an object that contains ownPropeties */
                    hasOwn = function(obj) {
                        var key;
                        if (obj === undefined || !obj instanceof Object) { return false; }
                        for (key in obj) {
                            if (hasOwnProp.call(obj, key)) { return true; }
                        }
                        return false;
                    },

                    /* 
                        Extend: helper function for copying parameters from one object to another.
                        Not a "full" object copy.  Arrays are assume to be flat, and contain only strings. Object depth limited
                    */
                    extend = function(obj, extension, overwrite, depth){
                        var i, j, key,
                            maxDepth=1; //keep copies shallow in case there's a bug in the config
                        if (overwrite !== false) {
                            overwrite = true;
                        }
                        if (depth === undefined) {
                            depth = 0;
                        }
                        for (key in extension){
                            if (hasOwnProp.call(extension, key)) {

                                /* copy arrays - only arrays of strings allowed */
                                if (extension[key] instanceof Array) {
                                    if (!obj[key] instanceof Array && !overwrite) continue;
                                    /* http://stackoverflow.com/questions/1584370 */
                                    obj[key] = (obj[key] || []).concat(extension[key]);
                                    for (i=0; i<obj[key].length; ++i) {
                                        for (j=i+1; j<obj[key].length; ++j) {
                                            if (obj[key][i] === obj[key][j]) {
                                                obj[key].splice(j--,1);
                                            }
                                        }
                                    }
                                } else if (extension[key] instanceof Object) {
                                    if (!obj[key] instanceof Object && !overwrite) continue;

                                    obj[key] = obj[key] || {};
                                    if (depth <= maxDepth) {
                                        extend(obj[key],extension[key],overwrite,depth++);
                                    }

                                } else if (obj[key] === undefined || overwrite) {
                                    obj[key] = extension[key];
                                }

                                
                            }
                        }
                    };

                function box(options) {
                    this.options = {
                        cols: 36,
                        rows: 18,
                        message: "The quick brown fox jumped over the two lazy dogs",
                        domElmId: ""
                    };
                    extend(this.options, options);

                    this.total = this.options.rows * this.options.cols;
                    this.buffer = [];
                    this.cleanChars = [];
                    this.msg = this.options.message;

                    if (this.options.domElmId == "") {
                        this.domElm = document.getElementsByTagName("body")[0];
                    } else {
                        this.domElm = document.getElementById(this.options.domElmId);
                    }

                    this.init();
                }

                box.prototype.init = function(msg) {
                    if (msg !== undefined) {
                        this.msg = msg;
                    }
                    this.initRandom();
                    this.populateBuffer();
                }

                box.prototype.initRandom = function() {
                    this.domElm.innerHTML = "";
                    for (var i=0;i<this.total;i++) {
                        this.domElm.innerHTML += this.getRandLatin();
                    }
                }

                box.prototype.updateChar = function(recurse) {
                    if (this.cleanChars.length) {
                        var self = this,
                            j = Math.floor(Math.random() * this.cleanChars.length),
                            i = this.cleanChars[j];

                        this.cleanChars.splice(j,1);

                        this.domElm.innerHTML = this.domElm.innerHTML.substring(0,i) + this.buffer[i] + this.domElm.innerHTML.substring(i+1);
                        if (recurse !== undefined && recurse) {
                            setTimeout(function() {self.updateChar(true)}, 0);
                        }
                    }
                }

                box.prototype.populateBuffer = function() {
                    var msgRows = Math.ceil(this.msg.length/this.options.cols),
                        rowLength = Math.ceil(this.msg.length/msgRows),
                        msgArr = this.msg.split(" "),
                        cursor = Math.floor((this.options.rows - msgRows)/2) * this.options.cols,
                        line = "",
                        nextLen;

                    /* initialize arrays */
                    for (var i=0;i<this.total;i++) {
                        this.cleanChars[i] = i;
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

                        if (line.length >= rowLength || line.length + nextLen > this.options.cols || nextLen == 0) {
                            // write line to buffer
                            cursor += Math.floor((this.options.cols - line.length)/2)  //pad left

                            for (i=0;i<line.length;i++) {
                                this.buffer[cursor++] = line.charAt(i);
                            }

                            cursor += Math.ceil((this.options.cols - line.length)/2)  //pad right
                            line = "";
                        } else {
                            line += " ";
                        }
                    }
                }

                box.prototype.getRandLatin = function() {
//                return String.fromCharCode(0x30A0 + Math.random() * (0x30FF-0x30A0+1));   //katakana
//                return String.fromCharCode(0x0041 + Math.random() * (0x005A-0x0041+1));   //uppercase A-Z
                    return String.fromCharCode(0x0061 + Math.random() * (0x007A-0x0061));      //lowercase a-z
                }

                /*
                * expose box class
                */
                return function(options) {
                    return new box(options);
                }

            }());
