var mySearch = function(searchString, element, activeTrigger) {
  if(activeTrigger == "@") {
    return element.value;
  }
  return false;
};

var mySelect = function(element, activeTrigger, position) {
  if(activeTrigger == "@") {
    return element.value;
  }
};

$(document).ready(function(){
  $("textarea").geniusBox({
    datasource: { "@": "data.json" },
    onSearch: mySearch, onSelect: mySelect
  });
});