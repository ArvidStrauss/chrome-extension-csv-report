//this is a background script that is linked to the popup content (index.html)
//same as background.js it can only communicate with the content of the website via chrome extension apis

//set default Date values for the form fields "startdate" and "enddate"
var now = new Date();
now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
document.getElementById('date-end').value = now.toISOString().slice(0, 16);

var twoyearsago = new Date(new Date().setFullYear(new Date().getFullYear() - 4));
twoyearsago.setMinutes(twoyearsago.getMinutes() - twoyearsago.getTimezoneOffset());
document.getElementById('date-start').value = twoyearsago.toISOString().slice(0, 16);

// show a message with a type of the input
function showMessage(input, message, type) {
  // get the small element and set the message
  const msg = input.parentNode.querySelector('small');
  msg.innerText = message;
  // update the class for the input
  input.className = type ? 'success' : 'error';
  return type;
}

function showError(input, message) {
  return showMessage(input, message, false);
}

function showSuccess(input) {
  return showMessage(input, '', true);
}

function hasValue(input, message) {
  if (input.value.trim() === '') {
    return showError(input, message);
  }
  return showSuccess(input);
}

const form = document.querySelector('#signup');

const DATE_REQUIRED = 'Please enter a date';

form.addEventListener('submit', function (event) {
  // stop form submission
  event.preventDefault();

  // validate the form
  let startDate = hasValue(form.elements['date-start'], DATE_REQUIRED);
  let endDate = hasValue(form.elements['date-end'], DATE_REQUIRED);

  //if valid, submit the form.
  if (startDate && endDate) {
    chrome.storage.local.get(['token'], function (result) {
      //get Data from GRAPHQL Api
      fetch('https://xocohlsel5cffkxmqh5vrv5yay.appsync-api.eu-central-1.amazonaws.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: result.token,
        },
        body: JSON.stringify({
          operationName: 'contentPerformance',
          variables: {
            from: form.elements['date-start'].value,
            to: form.elements['date-end'].value,
            title: '',
            typeInclusions: ['blog-article', 'timeline-item', 'wiki-article'],
            sortColumn: 'reach',
            sortOrder: 'desc',
            limit: form.elements['number-results'].value,
            senderId: null,
            includeUserGeneratedContent: true,
            globalFilters: [],
          },
          query:
            'query contentPerformance($from:String!,$to:String!,$title:String,$typeInclusions:[String]!,$sortColumn:String!,$sortOrder:String!,$limit:Int!,$senderId:String,$includeUserGeneratedContent:Boolean,$globalFilters:[GlobalFilter!]){\ncontentPerformance(from:$from,to:$to,title:$title,typeInclusions:$typeInclusions,sortColumn:$sortColumn,sortOrder:$sortOrder,limit:$limit,senderId:$senderId,includeUserGeneratedContent:$includeUserGeneratedContent,globalFilters:$globalFilters){\nid\ncreationTime\ntitle\ntype\nlikes\ncomments\nshares\nreach\nreachTrackedSinceCreation\nengagementRate\nlink\n}\n}\n',
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          console.log(data);
          //create empty CSV
          let csvContent = 'data:text/csv;charset=utf-8,',
            logData = '',
            headerFields = '';
          //write Headerfields once to the first line in the csv
          for (const [key, value] of Object.entries(data.data.contentPerformance[0])) {
            headerFields += `${key};`;
          }
          csvContent += headerFields + '\r\n';

          //fill the lines in the CSV with Data Results
          data.data.contentPerformance.forEach((element) => {
            logData = '';
            for (const [key, value] of Object.entries(element)) {
              //put all Text in QuotationMarks into CSV to avoid errors with \n and \r
              logData += typeof value === 'string' ? `"${value.replace(/#/g, '')}";` : `"${value}";`;
            }
            csvContent += logData + '\r\n';
          });

          var encodedUri = encodeURI(csvContent);

          //download the CSV as generic file-name (D)
          //window.open(encodedUri, '_self');

          //download the file with a new name
          var downloadLink = document.createElement('a');
          downloadLink.href = encodedUri;
          downloadLink.download = 'CoyoAnalyticsDailyReport.csv';

          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        });
    });
  }
});
