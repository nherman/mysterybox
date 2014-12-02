/*
* resolveByColumn plugin for MYSTERYBOX
* effect (vaguely) similar to code displays in the matrix movies
* would probably look better using katakana
*/
(function(Box) {
    "use strict";

    if (typeof Box !== "function") return;
    Box.prototype.resolveByColumn = function(options) {
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

                    function resolveByColumn(intervalHandle, row, col) {
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
                        self.trigger("mb_charUpdated");


                        /* not done with the column yet - recurse */
                        if (++row != self.rows) {
                            setTimeout(function() {
                                resolveByColumn(intervalHandle, row, col);
                            },recursionDelay);
                        } else if (charUpdateCount >= self.total) {
                            self.trigger("mb_allCharsUpdated");
                        }

                    }

                    return resolveByColumn;
                })()
            };
        Box.extend(opt, options);

        this.loop(opt);
    }
    
})(window.MYSTERYBOX);
