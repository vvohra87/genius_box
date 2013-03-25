# Genius Box - v 1.0.0
--------------------

Genius Box is a jQuery plugin for textareas. It allows for trigger based autocomplete on textareas.

Check out the `demos/index.html` to get started!

### Configuration Options
--------------------

#### datasource

Required parameter. Takes in an array of hashes. Each hash key value is the trigger key and it's accompanying data source. Currently, only remote JSON endpoints are supported. In the future will add local arrays / json objects.
Default is `null`.

    datasource: [ { "@": "/ajax1.php" }, { "!": "/ajax2.php" } ]

#### minLength

Optional parameter. The number of characters after a trigger key is pressed to begin AJAX searching. Similar the jQuery UI's autocomplete plugin option.
Default is `3`.

    minLength: 1

#### spaceSelection

Optional parameter. If set to true, when pressing space on an active autocomplete it will select the chosen option. If set to false, it will consider the space as part of the query string for AJAX calls.
Default is `false`.

    spaceSelection: true

#### limit

Optional parameter. On every AJAX request, `limit=5` is added to the post request. Allows smaller and faster responsed from server side.
Default is `6`.

    limit: 6

#### onSearch(searchString, element, activeTrigger)

Required parameter. Function called once for each result from an AJAX search. Can be used for formatting purposes and highlighting, etc. Expects a string returned.
Default is `renderDefaultLocalSearch`.

    onSearch: function(searchString, element, activeTrigger){
      // do stuff
    }

#### onSelect(element, activeTrigger, position)

Required parameter. Function called when a result option is selected. `element` is the entire JSON object for the selected result. `position` is the start position of the result within the textarea.
Default is `null`.

    onSelect: function(element, activeTrigger, position){
      // do stuff
    }

#### autoExpand

Optional parameter. If set to true will do all the magic of expanding your textarea as you type, just like a Facebook status update textarea. Scrollbars suck :P
Default is `true`.

    autoExpand: true

### Dependencies
--------------------

Genius Box only needs jQuery to work. Currently it supports jQuery version 1.9+ so if you have an older version of jQuery be sure to include the jquery-migrate library.

### Browser Compatibility
--------------------

* Chrome 8+
* Firefox 3.5+

### TODOs
--------------------

1. Handle delete keypress
2. Add test suite
3. Check cross browser compatibility
4. Beef up demos and website

### Bug Tracking
--------------------

Found a bug? Please create an issue here on GitHub!

https://github.com/vvohra87/genius_box/issues

### Contributing
--------------------

If you'd like to contribute a feature or bugfix: Thanks! To make sure your fix/feature has a high chance of being included, please read the following guidelines:

1. Post a new GitHub Issue.
2. Make sure there are tests.


### Copyright and License
---------------------

Genius Box is Copyright 2013 Varun Vohra. It is freeware - dual licensed under Apache2 and GPL-v2 licenses.
For more details you can check the [LICENSE](https://github.com/vvohra87/genius_box/blob/master/LICENSE)