$(document).ready(function(){

  $("textarea").geniusBox({
    datasource: { "@": "data.json" },
    onSearch: function(searchString, element, activeTrigger) {
      if(activeTrigger == "@") {
        return $("<a/>").text(element.value + " " + element.id);
      }
      return false;
    },
    onSelect: function(element, activeTrigger, position) {
      if(activeTrigger == "@") {
        return element.value;
      }
    }
  });

});