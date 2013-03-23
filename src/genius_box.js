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

  var GeniusBox = function (element, options) {
    this.element  = element;
    this.$element = $(element);
    this.options  = options;
    this.metadata = this.$element.data(name);
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
      if(lookupString.length >= $obj.data(name).settings.minLength){
        $.ajax({
          async: true,
          cache: false,
          data: {searchQuery: lookupString, limit: $obj.data(name).settings.limit},
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
      } else {
        showError(lookupString + " is too short");
      }
    } else {
      renderUiItems($obj, lookupSource, lookupString);
    }
    setSelection($obj);
  }

  // render the html for result items.
  function renderUiItems($obj, data, searchString) {
    var lookupUi = $("#lookupui");
    var renderCount = 0;
    lookupUi.empty();
    $.each(data, function(index, element) {
      if(renderCount < $obj.data(name).settings.limit) {
        var displayElement = $obj.data(name).settings.onSearch(searchString, element, $obj.data(name).activeTrigger);
        if(displayElement) {
          lookupUi.append($("<li/>").attr("id", renderCount).data("itemData", element).addClass("lookupui_row ui-menu-item").html(displayElement));
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
  function startCapture($obj) {
    //render selection menu
    var lookupUi = $("<ul/>").attr("id", "lookupui").addClass("lookupui ui-autocomplete ui-front ui-menu ui-widget ui-widget-content");

    $(".lookupui_row").live("click", function() {
      $obj.data(name).currentSelection = $(this).attr("id");
      stopCapture($obj);
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
      left: $obj.position().left + $(".tail").position().left,
      top: $obj.position().top + $(".tail").position().top + 20
    });
  }

  // called upon selection or cancel to end the current lookup capture.
  function stopCapture($obj, cancelSelection) {
    cancelSelection = cancelSelection !== undefined ? cancelSelection : false;

    $(".lookupui_row").die("click");

    if(!cancelSelection) {
      var selection = $(".lookupui_row:eq(" + $obj.data(name).currentSelection + ")", "#lookupui");
      if(selection.size() > 0) {
        var storeText = $obj.val();
        var position = getInputSelection($obj.get(0)).start - $obj.data(name).currentCapture.length;
        var positionUpTo = position;

        var selectionText = selection.text();
        if($obj.data(name).settings.onSelect !== null) {
          selectionText = $obj.data(name).settings.onSelect(selection.data("itemData"), $obj.data(name).activeTrigger, position);
          positionUpTo--;
        }

        var newText = storeText.substr(0, positionUpTo) + selectionText + storeText.substr(position + $obj.data(name).currentCapture.length);
        $obj.val(newText);

        setInputSelection($obj.get(0), position + selectionText.length);
      }
    }
    $obj.data(name).currentCapture = "";
    $obj.data(name).currentSelection = undefined;
    $obj.data(name).capture = false;
    $("#lookupui").empty().remove();
  }

  // updates the current selection to the user.
  function setSelection($obj) {
    $obj.data(name).currentSelection = $obj.data(name).currentSelection === undefined ? 0 : $obj.data(name).currentSelection;
    $(".lookupui_row", "#lookupui").removeClass("lookupui_row_select");
    $(".lookupui_row:eq(" + $obj.data(name).currentSelection + ")", "#lookupui").addClass("lookupui_row_select");
  }

  GeniusBox.prototype = {
    init: function () {
      if (!this.$element.data(name)) {
        var config   = $.extend({}, $.fn.geniusBox.defaults, this.options, this.metadata);
        // assign a datasource for searches
        var lookupSource;
        lookupSource = config.datasource;
        // set this element as initialised
        this.$element.data(name, config);
        // track key down events on the object
        this.$element.bind('keydown', function(event) {
          if(typeof(this.$element.data(name)) == "undefined") {
            return false;
          }
          var preventKeyCodes = [9, 13, 27, 38, 40];
          if (this.$element.data(name).settings.spaceSelection === true) {
            preventKeyCodes.push(32);
          }
          //if capturing is active
          if (this.$element.data(name).capture === true) {
            if ($.inArray(event.which, preventKeyCodes) > -1) {
              event.preventDefault();
            }
          }
        });

        // track key press events on the object
        $(this).bind('keypress', function(event) {
          //if capture is not active AND trigger key found
          $.each(this.$element.data(name).datasource, function(trigger, data) {
            if (this.$element.data(name).capture === false && String.fromCharCode(event.which) == trigger) {
              this.$element.data(name).activeTrigger = trigger;
              this.$element.data(name).activeData = data;
              //this.$element.data(name).startupChar = true;
              startCapture(this.$element);
            }
          });
        });

        //track key up events on the object
        this.$element.bind('keyup', function(event) {
          //if capturing is active
          if (this.$element.data(name).capture === true) {
            //perform lookup key processing
            switch(event.which) {
            case 8://backspace
              if(this.$element.data(name).currentCapture === "") {
                stopCapture(this.$element, true);
                break;
              }
              this.$element.data(name).currentCapture = this.$element.data(name).currentCapture.substr(0, this.$element.data(name).currentCapture.length - 1);
              doSearch(this.$element);
              break;
            case 9://tab
              stopCapture(this.$element);
              break;
            case 13://return
              stopCapture(this.$element);
              break;
            case 27://esc
              stopCapture(this.$element, true);
              break;
            case 32://space
              if (this.$element.data(name).settings.spaceSelection === true) {
                $(".lookupui_row:eq(" + this.$element.data(name).currentSelection + ")", "#lookupui").text($(".lookupui_row:eq(" + this.$element.data(name).currentSelection + ")", "#lookupui").text() + " ");
                stopCapture(this.$element);
              } else {
                //this.$element.data(name).currentCapture += String.fromCharCode(event.which).replace(/[^a-zA-Z0-9 ]/g, '');
                //doSearch(this.$element);
                stopCapture(this.$element, true);
              }
              break;
            case 38://up
              if ((this.$element.data(name).currentSelection !== undefined) && (this.$element.data(name).currentSelection !== 0)) {
                this.$element.data(name).currentSelection -= 1;
              } else {
                this.$element.data(name).currentSelection = $(".lookupui_row").size() - 1;
              }
              setSelection(this.$element);
              break;
            case 40://down
              if ((this.$element.data(name).currentSelection !== undefined) && (this.$element.data(name).currentSelection < $(".lookupui_row", "#lookupui").size() - 1)) {
                this.$element.data(name).currentSelection += 1;
              } else {
                this.$element.data(name).currentSelection = 0;
              }
              setSelection(this.$element);
              break;
            default:
              var pullTo = getInputSelection(this.$element.get(0)).start;
              var realText = this.$element.val().substring(this.$element.data(name).startPullString,pullTo).replace(/[^a-zA-Z_0-9% ]/g, '');

              if(!this.$element.data(name).startupChar) {
                //this.$element.data(name).currentCapture += String.fromCharCode(event.which).replace(/[^a-zA-Z_0-9 ]/g, '');
                this.$element.data(name).currentCapture = realText;
              } else {
                this.$element.data(name).startupChar = false;
              }

              doSearch(this.$element);
              break;
            }
          }
        });
        if(this.$element.data(name).autoExpand === true){
          // Set the textarea to the content height. i.e. expand as we type.
          this.$element.on('keyup paste cut', function () {
            var contentHeight = $(this).textareaHelper('height');
            $(this).height(contentHeight);
            $(this).parent('.textareaBorder').height(contentHeight);
          });
        }

        //on mouse hover of a lookup result highlight it
        $(".lookupui_row").live("mouseover", function() {
          this.$element.data(name).currentSelection = $(this).attr("id");
          setSelection(this.$element);
        });

        $(".lookupui_row").live("mouseout", function() {
          this.$element.data(name).currentSelection = undefined;
          setSelection(this.$element);
        });
      }
      return this;
    },
    //destroy the plugin on the object and reset the object state
    destroy: function() {
      return this.each(function(){
        var $lookupObj = $(this);
        $lookupObj.unbind('keyup keydown');
        $lookupObj.removeData('lookup');
      });
    }
  };

  $.fn.geniusBox = function (options) {
    return this.each(function () {
      new GeniusBox(this, options).init();
    });
  };

  $.fn.geniusBox.defaults = {
    activeTrigger: undefined,
    activeData: undefined,
    settings: null,
    target: null,
    datasource: null,
    capture: false,
    currentCapture: '',
    startupChar: false,
    minLength: 3,
    spaceSelection: false,
    limit: 6,
    onSearch: renderDefaultLocalSearch,
    onSelect: null,
    autoExpand: true
  };

})(jQuery, window, document);