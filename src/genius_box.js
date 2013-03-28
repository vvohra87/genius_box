/*
 * Genius Box Plugin
 * https://github.com/vvohra87/genius_box
 *
 * Copyright 2013, Varun Vohra
 * Dual licensed under the Apache or GPL Version 2 licenses.
 * http://www.apache.org/licenses/LICENSE-2.0
 * http://www.gnu.org/licenses/gpl-2.0.html
 *
 */

;(function ($, window, document, undefined) {
  'use strict';
  var name = 'genius-box';
  var caretClass = 'textarea-helper-caret';
  // Styles that could influence size of the mirrored div
  var mirrorStyles = [
                       // Box Styles.
                       'box-sizing', 'height', 'width', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top',
                       // Font stuff.
                       'font-family', 'font-size', 'font-style', 'font-variant', 'font-weight',
                       // Spacing etc.
                       'word-spacing', 'letter-spacing', 'line-height', 'text-decoration', 'text-indent', 'text-transform',
                       // The direction.
                       'direction'
                     ];

  var GeniusBox = function (element, options) {
    this.element  = element;
    this.$element = $(element);
    this.options  = options;
    this.metadata = this.$element.data(name);
    this.$wrapper = $('<div/>').css({ 'position': 'relative', 'width': '100%'});
    this.$element.wrap(this.$wrapper);
    this.$mirror  = $('<div/>').css({ 'color': 'black', 'position': 'absolute', 'overflow': 'auto', 'white-space': 'pre-wrap', 'word-wrap': 'break-word', 'top': 1, 'left': 0, 'z-index': 9}).insertAfter(this.$element);
  };

  // throws error messages
  function showError(errorMessage) {
    $.error('geniusBox: ' + errorMessage);
  }

  // Sets the caret position inside a text area.
  function setInputSelection($obj, selectionStart, selectionEnd) {
    selectionEnd = selectionEnd !== undefined ? selectionEnd : selectionStart;
    if($obj.setSelectionRange) {
      $obj.focus();
      $obj.setSelectionRange(selectionStart, selectionEnd);
    } else if ($obj.createTextRange) {
      var range = $obj.createTextRange();
      range.collapse(true);
      range.moveEnd('character', selectionEnd);
      range.moveStart('character', selectionStart);
      range.select();
    }
  }

  // retrieve positions and selections from a text area.
  function getInputSelection($obj) {
    var start = 0;
    var end = 0;
    var normalizedValue;
    var range;
    var textInputRange;
    var len;
    var endRange;
    if (typeof $obj.selectionStart == "number" && typeof $obj.selectionEnd == "number") {
      start = $obj.selectionStart;
      end = $obj.selectionEnd;
    } else {
      range = document.selection.createRange();
      if (range && range.parentElement() == $obj) {
        len = $obj.value.length;
        normalizedValue = $obj.value.replace(/\r\n/g, "\n");
        //create a working TextRange that lives only in the input
        textInputRange = $obj.createTextRange();
        textInputRange.moveToBookmark(range.getBookmark());
        //check if the start and end of the selection are at the very end
        //of the input, since moveStart/moveEnd doesn't return what we want
        //in those cases
        endRange = $obj.createTextRange();
        endRange.collapse(false);
        if (textInputRange.compareEndPoints("StartToEnd", endRange) > -1) {
          start = end = len;
        } else {
          start = -textInputRange.moveStart("character", -len);
          start += normalizedValue.slice(0, start).split("\n").length - 1;
          if (textInputRange.compareEndPoints("EndToEnd", endRange) > -1) {
            end = len;
          } else {
            end = -textInputRange.moveEnd("character", -len);
            end += normalizedValue.slice(0, end).split("\n").length - 1;
          }
        }
      }
    }
    return {
      start: start,
      end: end
    };
  }

  // runs a search based on the current capture to present the user with viable selections
  function doSearch($obj) {
    var lookupString = $obj.data(name).currentCapture.toLowerCase();
    var lookupSource = $obj.data(name).activeData;
    if (typeof(lookupSource) == "string") {
      // get the data from ajax source check length to be min-length for ajax lookup
      if(lookupString.length >= $obj.data(name).minLength){
        $.ajax({
          async: true,
          cache: false,
          data: {searchQuery: lookupString, limit: $obj.data(name).limit},
          error: function(xhr, status, error) {
            showError('ajax error - ' + status + ' - ' + error);
          },
          success: function(renderData) {
            renderUiItems($obj, renderData, lookupString);
          },
          timeout: 10000,
          type: "POST",
          url: lookupSource
        });
      }
    } else {
      renderUiItems($obj, lookupSource, lookupString);
    }
    setSelection($obj);
  }

  // render the html for result items.
  function renderUiItems($obj, data, searchString) {
    var lookupUi = $(".lookupui");
    var renderCount = 0;
    lookupUi.empty();
    $.each(data, function(index, element) {
      if(renderCount < $obj.data(name).limit) {
        var displayElement = $obj.data(name).onSearch(searchString, element, $obj.data(name).activeTrigger);
        if(displayElement) {
          lookupUi.append($("<li/>").attr("id", renderCount).data("itemData", element).html(displayElement));
          renderCount++;
        }
      }
    });
  }

  function renderDefaultLocalSearch(searchString, element) {
    //default searches look for the label key item and check it contains the search string
    if(element.substr(0, searchString.length).toLowerCase() == searchString) {
      //return the label item for display
      return element;
    }
    // else dont display this item
    return false;
  }

  // called upon trigger key to render the selections menu and begin capture.
  function startCapture($obj, tokens) {
    //render selection menu
    var lookupUi = $("<ul/>").attr("id", "lookupui").addClass("lookupui");

    $("body").on("click", ".lookupui > li > a", function() {
      $obj.data(name).currentSelection = $(this).attr("id");
      setSelection($obj);
      stopCapture($obj, false, tokens);
      $obj.focus();
    });

    $obj.data(name).startPullString = getInputSelection($obj.get(0)).start;

    //set capture to active
    $obj.data(name).capture = true;

    //add selection division
    lookupUi.width(300);
    $obj.after(lookupUi);

    //position the selection division
    lookupUi.css({
      left: $obj.position().left + $(".textarea-helper-caret").position().left,
      top: $obj.position().top + $(".textarea-helper-caret").position().top + 20
    });
  }

  // called upon selection or cancel to end the current lookup capture.
  function stopCapture($obj, cancelSelection, tokens) {
    cancelSelection = cancelSelection !== undefined ? cancelSelection : false;

    $(".lookupui > li > a").off("click");

    if(!cancelSelection) {
      var selection = $(".lookupui li:eq(" + $obj.data(name).currentSelection + ")");
      if(selection.size() > 0) {
        var storeText = $obj.val();
        var position = getInputSelection($obj.get(0)).start - $obj.data(name).currentCapture.length;
        var positionUpTo = position;
        var selectionText = selection.text();
        if($obj.data(name).onSelect !== null) {
          selectionText = $obj.data(name).onSelect(selection.data("itemData"), $obj.data(name).activeTrigger, position);
          positionUpTo--;
        }
        var newText = storeText.substr(0, positionUpTo) + selectionText + storeText.substr(position + $obj.data(name).currentCapture.length);
        $obj.val(newText);
        tokens.push([selectionText, selection.data("itemData"), positionUpTo, selectionText.length]);
        tokens.sort(function(a,b){return a[2] - b[2];});
        setInputSelection($obj.get(0), position + selectionText.length);
      }
    }
    $obj.data(name).currentCapture = "";
    $obj.data(name).currentSelection = undefined;
    $obj.data(name).capture = false;
    $(".lookupui").empty().remove();
  }

  // updates the current selection to the user.
  function setSelection($obj) {
    $obj.data(name).currentSelection = $obj.data(name).currentSelection === undefined ? 0 : $obj.data(name).currentSelection;
    $(".lookupui > li").removeClass("active");
    $(".lookupui > li:eq(" + $obj.data(name).currentSelection + ")").addClass("active");
  }

  // XBrowser caret position
  // Adapted from http://stackoverflow.com/questions/263743/how-to-get-caret-position-in-textarea
  function getOriginalCaretPos($obj) {
    var text = $obj;
    if (text.selectionStart) {
      return text.selectionStart;
    } else if (document.selection) {
      text.focus();
      var r = document.selection.createRange();
      if (r === null) {
        return 0;
      }
      var re = text.createTextRange();
      var rc = re.duplicate();
      re.moveToBookmark(r.getBookmark());
      rc.setEndPoint('EndToStart', re);
      return rc.text.length;
    }
    return 0;
  }

  function height($obj, $mirror) {
    $mirror.css('height', '');
    return $mirror.height();
  }

  // Get the caret position at any time
  function caretPos($obj, $mirror) {
    var $caret = $mirror.find('.' + caretClass);
    var pos    = $caret.position();
    if ($obj.css('direction') === 'rtl') {
      pos.right = $mirror.innerWidth() - pos.left - $caret.width();
      pos.left = 'auto';
    }
    return pos;
  }

  function updateTokenPositions($obj, $mirror, tokens){
    var pos = getInputSelection($obj.get(0)).start;
    var str = $obj.val();
    // subtraction event
    if ($obj.data("original").length > str.length){
      console.log("subtraction event took place.");
      for(var i = 0; i < tokens.length; i++){
        // see if backspace is in the middle of existing token.
        if (pos > tokens[i][2] && pos < tokens[i][2] + tokens[i][3]){
          console.log("subtraction event took place inside token #" + i);
          var removedLength = tokens[i][0].length;
          // update all tokens after the one being deleted.
          $.each(tokens, function(index, token){
            if(tokens[i][2] < token[2]){
              console.log("token " + token[0] + "was moved back by 1");
              token[2] = token[2] - removedLength - 1;
            }
          });
          str = str.substr(0, tokens[i][2]) + str.substr(tokens[i][2] + tokens[i][3]);
          console.log("token deleted, value is now: " + str);
          tokens.splice(i,1);
        } else {
          console.log("additive event took place.");
          if(tokens[i][2] > pos){
            console.log("token #" + i + " was moved forward by 1");
            tokens[i][2]--;
          }
        }
      }
      $obj.val(str);
    }
    // additive event.
    else if ($obj.data("original").length < str.length){
      for(var j = 0; j < tokens.length; j++){
        if(tokens[j][2] > pos){
          tokens[j][2]++;
        }
      }
    }
    $obj.data("original", $obj.val());
  }

  // Update the mirror div
  function update($obj, $mirror, tokens) {
    // Copy styles.
    var styles = {};
    for (var k = 0; k < mirrorStyles.length; k++) {
      styles[mirrorStyles[k]] = $obj.css(mirrorStyles[k]);
    }
    $mirror.css(styles).empty();
    // Update content and insert caret.
    var caretPos = getOriginalCaretPos($obj);
    var s = $obj.val();
    var html = "";
    var start = 0;
    for (var h=0; h< tokens.length; h++){
      if(tokens[h][2] > 1) {
        html += s.substr(start, tokens[h][2] - start);
      }
      html += '<span class="highlight">' + tokens[h][0] + '</span>';
      start = tokens[h][2] + tokens[h][3];
    }
    if (start != s.length){
      html += s.substr(start, s.length);
    }
    html = html.replace(new RegExp(preg_quote('  '), 'gi' ), '&nbsp;&nbsp;');
    $mirror.html(html.replace(/(\r\n|\r|\n)/g, "<br />"));
    var $car = $('<span/>').addClass(caretClass).html('&nbsp;');
    $mirror.append($car).scrollTop($obj.scrollTop());
    setInputSelection($obj, caretPos, caretPos);
  }

  function preg_quote(str) {
    return (str).replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\\<\>\|\:])/g, "\\$1");
  }

  GeniusBox.prototype = {
    init: function () {
      var ele = this.$element;
      ele.data("original", ele.val());
      ele.css({ 'background': 'transparent', 'position': 'absolute', 'z-index':10});
      var mirror = this.$mirror;
      if (!ele.data(name)) {
        var privateOptions = {
          activeTrigger: undefined,
          activeData: undefined,
          capture: false,
          currentCapture: '',
          startupChar: false,
          tokens: []
        };
        var config = $.extend({}, $.fn.geniusBox.defaults, this.options, this.metadata, privateOptions);
        // assign a datasource for searches
        var lookupSource;
        lookupSource = config.datasource;
        var tokens = config.tokens;
        // set this element as initialised
        ele.data(name, config);
        update(ele, mirror, tokens);

        // track key down events on the object
        ele.bind('keydown', function(event) {
          var preventKeyCodes = [9, 13, 27, 38, 40];
          if (ele.data(name).spaceSelection === true) {
            preventKeyCodes.push(32);
          }
          //if capturing is active
          if (ele.data(name).capture === true) {
            if ($.inArray(event.which, preventKeyCodes) > -1) {
              event.preventDefault();
            }
          }
        });

        // track key press events on the object
        ele.bind('keypress', function(event) {
          //if capture is not active AND trigger key found
          $.each(ele.data(name).datasource, function(trigger, data) {
            if (ele.data(name).capture === false && String.fromCharCode(event.which) == trigger) {
              ele.data(name).activeTrigger = trigger;
              ele.data(name).activeData = data;
              startCapture(ele, tokens);
            }
          });
        });

        //track key up events on the object
        ele.bind('keyup', function(event) {
          //if capturing is active
          if (ele.data(name).capture === true) {
            //perform lookup key processing
            switch(event.which) {
            case 8: //backspace
              if(ele.data(name).currentCapture === "") {
                stopCapture(ele, true, tokens);
                break;
              }
              ele.data(name).currentCapture = ele.data(name).currentCapture.substr(0, ele.data(name).currentCapture.length - 1);
              doSearch(ele);
              break;
            case 9://tab
              stopCapture(ele, false, tokens);
              break;
            case 13://return
              stopCapture(ele, false, tokens);
              break;
            case 27://esc
              stopCapture(ele, true, tokens);
              break;
            case 32://space
              if (ele.data(name).spaceSelection === true) {
                $(".lookupui > li:eq(" + ele.data(name).currentSelection + ")").text($(".lookupui li:eq(" + ele.data(name).currentSelection + ")").text() + " ");
                stopCapture(ele, false, tokens);
              } else {
                ele.data(name).currentCapture += String.fromCharCode(event.which).replace(/[^a-zA-Z0-9 ]/g, '');
                doSearch(ele);
                // stopCapture(ele, true, tokens);
              }
              break;
            case 38: //up
              if ((ele.data(name).currentSelection !== undefined) && (ele.data(name).currentSelection !== 0)) {
                ele.data(name).currentSelection -= 1;
              } else {
                ele.data(name).currentSelection = $(".lookupui > li").size() - 1;
              }
              setSelection(ele);
              break;
            case 40: //down
              if ((ele.data(name).currentSelection !== undefined) && (ele.data(name).currentSelection < $(".lookupui > li").size() - 1)) {
                ele.data(name).currentSelection += 1;
              } else {
                ele.data(name).currentSelection = 0;
              }
              setSelection(ele);
              break;
            default:
              var pullTo = getInputSelection(ele.get(0)).start;
              var realText = ele.val().substring(ele.data(name).startPullString,pullTo).replace(/[^a-zA-Z_0-9% ]/g, '');
              if(!ele.data(name).startupChar) {
                //this.$element.data(name).currentCapture += String.fromCharCode(event.which).replace(/[^a-zA-Z_0-9 ]/g, '');
                ele.data(name).currentCapture = realText;
              } else {
                ele.data(name).startupChar = false;
              }

              doSearch(ele);
              break;
            }
          } else{
            updateTokenPositions(ele, mirror, tokens);
          }
        });

        // updating the hidden div needs to happen all the time - as close to real time as possible.
        ele.bind("input onpropertychange", function(event){
          // Set the textarea to the content height. i.e. expand as we type.
          var contentHeight = height(ele, mirror);
          ele.height(contentHeight);
          ele.parent().height(contentHeight);
          update(ele, mirror, tokens);
        });

        //on mouse hover of a lookup result highlight it
        $(".lookupui > li").on("mouseover", function() {
          ele.data(name).currentSelection = $(this).attr("id");
          setSelection(ele);
        });

        $(".lookupui > li").on("mouseout", function() {
          ele.data(name).currentSelection = undefined;
          setSelection(ele);
        });
      }
      return this;
    },
    //destroy the plugin on the object and reset the object state
    destroy: function() {
      return this.each(function(){
        var $lookupObj = $(this);
        $lookupObj.unbind('keyup keypress keydown');
        $lookupObj.removeData(name);
      });
    }
  };

  $.fn.geniusBox = function (options) {
    return this.each(function () {
      new GeniusBox(this, options).init();
    });
  };

  $.fn.geniusBox.defaults = {
    datasource: null,
    minLength: 3,
    spaceSelection: false,
    limit: 6,
    onSearch: renderDefaultLocalSearch,
    onSelect: null,
    autoExpand: true
  };

})(jQuery, window, document);