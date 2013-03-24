var terms = [];

var mySearch = function(searchString, element, activeTrigger) {
  if(activeTrigger == "@") {
    return element.text;
  }
  return false;
};

var mySelect = function(element, activeTrigger, position) {
  if(activeTrigger == "@") {
    var marker  = "<input type='hidden' name='interaction[interaction_markers_attributes][][position]' value='" + element.text.length + "'/>";
    marker     += "<input type='hidden' name='interaction[interaction_markers_attributes][][offset]' value='" + (position - 1) + "'/>";
    marker     += "<input type='hidden' name='interaction[interaction_markers_attributes][][markable_type]' value='" + element.type + "'/>";
    marker     += "<input type='hidden' name='interaction[interaction_markers_attributes][][markable_id]' value='" + element.id + "'/>";
    $("#new_interaction").append(marker);
    terms.push(element.text);
    return element.text;
  }
};

$(document).ready(function(){
  $("#myTextData").lookup({minLength: 3, onSearch: mySearch, onSelect: mySelect, data: {"@": "/sherlock/autocomplete/interactions"} } );
  $('#myTextData').on('keyup paste cut', function () {
    highlight(myTextData, myOtherTextarea);
    var contentHeight = $(this).textareaHelper('height');
    $(this).height(contentHeight); // Set the textarea to the content height. i.e. expand as we type.
    $(this).parent('.textareaBorder').height(contentHeight);
    $('.tail').css(
      $(this).textareaHelper('caretPos') // Follow the caret around.
    );
  });
  $('#myTextData').keyup();
});

function preg_quote(str) {
  return (str).replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\\<\>\|\:])/g, "\\$1");
}

function highlight(textElement,divElement) {
  textElement.value = textElement.value.replace( new RegExp(preg_quote('  '), 'gi' ), ' ');
  var s = textElement.value;
  for (i=0; i<terms.length; i++)
    s = s.replace( new RegExp( preg_quote( terms[i] ), 'gi' ), '<span class="highlight">' + terms[i] + '</span>' );
    divElement.innerHTML = s.replace(/(\r\n|\r|\n)/g, "<br />");
}