# mysterybox

##### "The useless little library with the dumb name"

Mysterybox is a Javascript library that can fill a DOM element with either
random or non-random text and animate betweemn the two states. The original idea was to create the effect of random characters "dissoving" into a readable message.  However, it's customizable to the point where it's essentially a tool for generating loops that do whatever you want.

### Basic Usage

```javascript
<div id="mysterybox" style="width:300px;height:300px;"></div>
<script src="https://raw.githubusercontent.com/nherman/mysterybox/master/mysterybox.js"></script>
<script>
    /* init DOM element */
    var mb = new window.MYSTERYBOX({
        "domElmId": "mysterybox", /* optional - default element is document.body */
        "message": "Look what we found in the park in the dark. We will take him home.  We will call him Clark."
    });

    /* populate element with random characters */
    mb.initRandom();

    /* randomly update characters until the message is revealed */
    mb.resolve();

    /* change the message */
    mb.initMsg("He will live at our house. He will grow and grow! Will our mother like this? We don't know.");

    /* Display the message immediately */
    mb.renderMsg();

    /* randomly update characters until the message is fully obscured */
    mb.dissolve();
</script>
```

### Behind the Scenes

Resolve and Dissolve depend on the the loop() method.  Loop generates a group of threads (setInterval calls) which simply call an update function.

The update function does the work of editing the display buffer, fires an event after each character is updated, and another when updates are complete. Periodically, Loop will render changes to the browser.

UpdateChar() is the default update function used by Resolve and Dissolve. It simply picks a character at random and updates it.


### Advanced Usage

```javascript
/* Resolve the message, wait 2 seconds, dissolve again then show a new message */
var mb = new window.MYSTERYBOX({
    "message":"Look at this pet. Say! He is wet!"
});
mb.initRandom();
mb.resolve({

    /* option callback function gets called on complete */
    "callback": function() {
        setTimeout(function() {
            mb.dissolve({

                /* nest callbacks as much as you like */
                "callback": function() {
                    mb.initMsg("You never yet met a pet, I bet, as wet as they let this wet pet get.")
                    mb.renderMsg();
                }
            });
        },2000);
    }
});
```

```javascript
/* Customize loop options */
mb.resolve({
    
    /* threads: number of intervals loop() will spawn.  Lower numbers resolve more slowly */
    "threads": 50,

    /* intervalMilliseconds: delay between interval iterations. Higher numbers resolve more slowly */
    "intervalMilliseconds": 50,

    /* renderEventName: event that triggers rendering of display */
    "renderEventName": "mb_charUpdated",

    /* clearEventName: event that signals clean up */
    "clearEventName": "mb_allCharsUpdated",

    /* renderFrequency: how often to render display. lower numbers display more often */
    "renderFrequency": 1,

    /* updateFunction: function that gets called on each interval iteration */
    "updateFunction": function() {
        mb.updateChar();
    },

    /* callback: function that gets run on completion */
    "callback": function() { console.log("All done!"); }
});
